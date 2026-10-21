import json

import boto3
import fakeredis
import jwt
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

from backend import worker
from backend.main import app
from backend.models.programGeneration import ProgramResult
from backend.routes import programs as programs_routes
from backend.utils import programJobs, programQueue
from backend.utils.limiter import limiter
from backend.utils.programQueue import QueueError

GENERATE_URL = "/api/v1/programs/generate"
LATEST_URL = f"{GENERATE_URL}/latest"

PROGRAM_OPTIONS = {
    "fitness_goal": "Strength",
    "years_of_experience": "1-2",
    "days_per_week": "3",
    "age": 25,
    "weight": 180,
    "weight_unit": "lb",
    "gender": "Male",
    "isLoggedIn": True,
    "freeLimitEnabled": False,
}

GENERATED_PROGRAM = ProgramResult(
    name="Upper / Lower",
    program_structure=[{
        "day": "Monday",
        "focus": "Upper",
        "exercises": [{"name": "Bench Press", "sets": "3", "reps": "8", "exercise_tip": "Brace"}],
    }],
    program_tips_and_goals=["Sleep 8 hours"],
)


class JobsTestClient(TestClient):
    sqs: object
    queue_url: str


def auth_header(user_id):
    token = jwt.encode({"sub": user_id}, "test-jwt-secret-key-that-is-long-enough", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def redis(monkeypatch):
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(programJobs, "redis_client", fake)
    return fake


@pytest.fixture
def client(monkeypatch, redis):
    with mock_aws():
        sqs = boto3.client("sqs", region_name="us-east-1")
        # 0 s visibility so an unacked message is redelivered on the very next receive
        queue_url = sqs.create_queue(QueueName="program-generation", Attributes={"VisibilityTimeout": "0"})["QueueUrl"]
        programQueue._client.cache_clear()
        monkeypatch.setattr(programQueue, "RECEIVE_WAIT_SECONDS", 0)
        limiter.reset()

        test_client = JobsTestClient(app)
        test_client.sqs, test_client.queue_url = sqs, queue_url
        yield test_client
    programQueue._client.cache_clear()


@pytest.fixture
def generator(monkeypatch):
    calls = []
    outcomes = []

    def fake_generate(options):
        calls.append(options)
        outcome = outcomes.pop(0) if outcomes else GENERATED_PROGRAM
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(worker, "generate_program", fake_generate)
    fake_generate.calls, fake_generate.outcomes = calls, outcomes
    return fake_generate


def queued_messages(client):
    attributes = client.sqs.get_queue_attributes(
        QueueUrl=client.queue_url,
        AttributeNames=["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible"],
    )["Attributes"]
    return int(attributes["ApproximateNumberOfMessages"]) + int(attributes["ApproximateNumberOfMessagesNotVisible"])


def start_job(client, user_id="user-1"):
    headers = auth_header(user_id) if user_id else {}
    response = client.post(GENERATE_URL, json=PROGRAM_OPTIONS, headers=headers)
    assert response.status_code == 202
    return response.json()["job_id"]


def job_status(client, job_id, user_id="user-1"):
    headers = auth_header(user_id) if user_id else {}
    return client.get(f"{GENERATE_URL}/{job_id}", headers=headers)


## Routes

def test_post_writes_a_pending_job_and_sends_one_message(client):
    job_id = start_job(client)

    assert job_status(client, job_id).json() == {"status": "pending"}
    message = client.sqs.receive_message(QueueUrl=client.queue_url)["Messages"][0]
    assert json.loads(message["Body"]) == {"job_id": job_id, "options": PROGRAM_OPTIONS}
    assert queued_messages(client) == 1


def test_second_post_while_pending_returns_the_same_job_without_a_new_message(client):
    job_id = start_job(client)

    assert start_job(client) == job_id
    assert queued_messages(client) == 1


def test_free_limit_still_requires_login(client):
    response = client.post(GENERATE_URL, json={**PROGRAM_OPTIONS, "freeLimitEnabled": True})

    assert response.status_code == 401
    assert queued_messages(client) == 0


def test_failed_enqueue_returns_503_and_leaves_no_job(client, monkeypatch, redis):
    def failing_enqueue(job_id, options):
        raise QueueError("SQS is down")

    monkeypatch.setattr(programs_routes, "enqueue", failing_enqueue)

    response = client.post(GENERATE_URL, json=PROGRAM_OPTIONS, headers=auth_header("user-1"))

    assert response.status_code == 503
    assert redis.keys("progen:*") == []


def test_another_users_job_is_not_found(client):
    job_id = start_job(client, user_id="user-1")

    assert job_status(client, job_id, user_id="user-2").status_code == 404


def test_anonymous_job_can_be_read_with_only_its_id(client):
    job_id = start_job(client, user_id=None)

    assert job_status(client, job_id, user_id=None).json() == {"status": "pending"}


def test_unknown_job_is_not_found(client):
    assert job_status(client, "no-such-job").status_code == 404


def test_invalid_token_is_rejected_instead_of_treated_as_anonymous(client):
    response = client.post(GENERATE_URL, json=PROGRAM_OPTIONS, headers={"Authorization": "Bearer not-a-jwt"})

    assert response.status_code == 401
    assert queued_messages(client) == 0


def test_latest_returns_the_users_newest_job(client, generator):
    job_id = start_job(client)
    worker.process_next()

    response = client.get(LATEST_URL, headers=auth_header("user-1"))

    assert response.status_code == 200
    assert response.json() == {"job_id": job_id, "status": "done", "program": GENERATED_PROGRAM.model_dump()}


def test_latest_is_not_found_without_a_job(client):
    assert client.get(LATEST_URL, headers=auth_header("user-1")).status_code == 404


def test_latest_requires_login(client):
    assert client.get(LATEST_URL).status_code == 401


def test_delete_removes_the_job_and_the_user_pointer(client, redis):
    job_id = start_job(client)

    response = client.delete(f"{GENERATE_URL}/{job_id}", headers=auth_header("user-1"))

    assert response.status_code == 204
    assert job_status(client, job_id).status_code == 404
    assert client.get(LATEST_URL, headers=auth_header("user-1")).status_code == 404
    assert redis.keys("progen:*") == []


def test_delete_leaves_another_users_job_alone(client):
    job_id = start_job(client, user_id="user-1")

    assert client.delete(f"{GENERATE_URL}/{job_id}", headers=auth_header("user-2")).status_code == 204
    assert job_status(client, job_id, user_id="user-1").json() == {"status": "pending"}


## Worker

def test_worker_completes_the_job_and_deletes_the_message(client, generator):
    job_id = start_job(client)

    worker.process_next()

    assert job_status(client, job_id).json() == {"status": "done", "program": GENERATED_PROGRAM.model_dump()}
    assert queued_messages(client) == 0


def test_worker_leaves_the_message_for_redelivery_on_early_failures(client, generator):
    job_id = start_job(client)
    generator.outcomes.extend([RuntimeError("LLM timeout"), RuntimeError("LLM timeout")])

    worker.process_next()
    worker.process_next()

    assert len(generator.calls) == 2
    assert job_status(client, job_id).json() == {"status": "pending"}
    assert queued_messages(client) == 1


def test_worker_fails_the_job_on_the_last_attempt(client, generator):
    job_id = start_job(client)
    generator.outcomes.extend([RuntimeError("LLM timeout")] * worker.MAX_ATTEMPTS)

    for _ in range(worker.MAX_ATTEMPTS):
        worker.process_next()

    assert job_status(client, job_id).json() == {"status": "failed"}
    assert queued_messages(client) == 0


def test_worker_recovers_when_a_retry_succeeds(client, generator):
    job_id = start_job(client)
    generator.outcomes.append(RuntimeError("LLM timeout"))

    worker.process_next()
    worker.process_next()

    assert job_status(client, job_id).json()["status"] == "done"
    assert queued_messages(client) == 0


def test_worker_acks_a_duplicate_for_a_finished_job_without_generating(client, generator):
    job_id = start_job(client)
    worker.process_next()
    programQueue.enqueue(job_id, PROGRAM_OPTIONS)

    worker.process_next()

    assert len(generator.calls) == 1
    assert queued_messages(client) == 0


def test_worker_does_not_bring_back_a_job_deleted_mid_generation(client, generator, redis):
    job_id = start_job(client)

    def delete_then_generate(options):
        client.delete(f"{GENERATE_URL}/{job_id}", headers=auth_header("user-1"))
        return GENERATED_PROGRAM

    worker.generate_program = delete_then_generate
    worker.process_next()

    assert job_status(client, job_id).status_code == 404
    assert redis.keys("progen:*") == []


def test_finished_jobs_live_for_a_day(client, generator, redis):
    job_id = start_job(client)
    assert redis.ttl(f"progen:job:{job_id}") <= programJobs.PENDING_TTL_SECONDS

    worker.process_next()

    assert redis.ttl(f"progen:job:{job_id}") > programJobs.PENDING_TTL_SECONDS
    assert redis.ttl("progen:user:user-1") > programJobs.PENDING_TTL_SECONDS
