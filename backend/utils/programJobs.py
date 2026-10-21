import json
import secrets
from typing import Any, cast

from redis.exceptions import WatchError

from ..Database.redisClient import redis_client

## Covers three attempts at the 120 s visibility timeout plus queue wait
PENDING_TTL_SECONDS = 15 * 60
FINISHED_TTL_SECONDS = 24 * 60 * 60


def _job_key(job_id: str) -> str:
    return f"progen:job:{job_id}"

def _user_key(user_id: str) -> str:
    return f"progen:user:{user_id}"


def _load(job_id: str) -> dict[str, Any] | None:
    raw = cast(str | None, redis_client.get(_job_key(job_id)))
    return json.loads(raw) if raw else None


def _visible_to(job: dict[str, Any], user_id: str | None) -> bool:
    owner = job.get("user_id")
    return owner is None or owner == user_id


## Returns (job_id, is_new); a user with a pending job gets that job back instead of a new one
def create_job(user_id: str | None) -> tuple[str, bool]:
    job_id = secrets.token_urlsafe(16)
    job = json.dumps({"status": "pending", "user_id": user_id})
    if user_id is None:
        redis_client.set(_job_key(job_id), job, ex=PENDING_TTL_SECONDS)
        return job_id, True

    user_key = _user_key(user_id)
    with redis_client.pipeline() as pipe:
        while True:
            try:
                # WATCH makes a double-click race retry instead of creating two jobs
                pipe.watch(user_key)
                existing_id = cast(str | None, pipe.get(user_key))
                existing = _load(existing_id) if existing_id else None
                if existing_id and existing and existing["status"] == "pending":
                    pipe.unwatch()
                    return existing_id, False

                pipe.multi()
                pipe.set(_job_key(job_id), job, ex=PENDING_TTL_SECONDS)
                pipe.set(user_key, job_id, ex=PENDING_TTL_SECONDS)
                pipe.execute()
                return job_id, True
            except WatchError:
                continue


## None when the job is missing or belongs to another user
def get_job(job_id: str, user_id: str | None) -> dict[str, Any] | None:
    job = _load(job_id)
    if job is None or not _visible_to(job, user_id):
        return None
    return job


def is_pending(job_id: str) -> bool:
    job = _load(job_id)
    return job is not None and job["status"] == "pending"


def _finish(job_id: str, status: str, program: dict[str, Any] | None = None) -> None:
    job = _load(job_id)
    if job is None:
        return

    finished: dict[str, Any] = {"status": status, "user_id": job.get("user_id")}
    if program is not None:
        finished["program"] = program
    # XX so a job the user deleted mid-generation isn't brought back
    redis_client.set(_job_key(job_id), json.dumps(finished), ex=FINISHED_TTL_SECONDS, xx=True)

    user_id = job.get("user_id")
    if user_id and redis_client.get(_user_key(user_id)) == job_id:
        redis_client.expire(_user_key(user_id), FINISHED_TTL_SECONDS)


def complete_job(job_id: str, program: dict[str, Any]) -> None:
    _finish(job_id, "done", program)


def fail_job(job_id: str) -> None:
    _finish(job_id, "failed")


## Returns (job_id, job) for the user's newest job, or None
def latest_job(user_id: str) -> tuple[str, dict[str, Any]] | None:
    job_id = cast(str | None, redis_client.get(_user_key(user_id)))
    if job_id is None:
        return None
    job = get_job(job_id, user_id)
    return (job_id, job) if job else None


def delete_job(job_id: str, user_id: str | None) -> None:
    job = get_job(job_id, user_id)
    if job is None:
        return

    redis_client.delete(_job_key(job_id))
    owner = job.get("user_id")
    if owner and redis_client.get(_user_key(owner)) == job_id:
        redis_client.delete(_user_key(owner))
