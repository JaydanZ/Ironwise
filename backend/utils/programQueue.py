import json
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from ..config import get_settings

RECEIVE_WAIT_SECONDS = 20


class QueueError(Exception):
    pass


@dataclass
class QueuedJob:
    job_id: str
    options: dict[str, Any]
    receive_count: int
    receipt_handle: str


def _secret(value) -> str | None:
    return value.get_secret_value() if value else None


## Created on first use so moto can patch boto3 before the client exists in tests
@lru_cache
def _client():
    settings = get_settings()
    return boto3.client(
        "sqs",
        region_name=settings.AWS_REGION,
        endpoint_url=settings.SQS_ENDPOINT_URL or None,
        aws_access_key_id=_secret(settings.AWS_ACCESS_KEY_ID),
        aws_secret_access_key=_secret(settings.AWS_SECRET_ACCESS_KEY),
    )


def _queue_url() -> str:
    return get_settings().PROGRAM_QUEUE_URL


def enqueue(job_id: str, options: dict[str, Any]) -> None:
    try:
        _client().send_message(
            QueueUrl=_queue_url(),
            MessageBody=json.dumps({"job_id": job_id, "options": options}),
        )
    except (BotoCoreError, ClientError) as error:
        raise QueueError("Couldn't send the job to the queue") from error


## Long-polls for one message; None when the wait ends with nothing to do
def receive() -> QueuedJob | None:
    response = _client().receive_message(
        QueueUrl=_queue_url(),
        MaxNumberOfMessages=1,
        WaitTimeSeconds=RECEIVE_WAIT_SECONDS,
        MessageSystemAttributeNames=["ApproximateReceiveCount"],
    )
    messages = response.get("Messages", [])
    if not messages:
        return None

    message = messages[0]
    body = json.loads(message["Body"])
    return QueuedJob(
        job_id=body["job_id"],
        options=body["options"],
        receive_count=int(message["Attributes"]["ApproximateReceiveCount"]),
        receipt_handle=message["ReceiptHandle"],
    )


def ack(job: QueuedJob) -> None:
    _client().delete_message(QueueUrl=_queue_url(), ReceiptHandle=job.receipt_handle)
