import logging
import signal
import time

from .models.programGeneration import ProgramOptions
from .utils import programJobs, programQueue
from .utils.programGenerator import generate_program

logger = logging.getLogger(__name__)

## Matches max_receive_count in infra/terraform; on this delivery SQS won't redeliver, it dead-letters
MAX_ATTEMPTS = 3
ERROR_BACKOFF_SECONDS = 5

stop_requested = False


def _request_stop(signum, frame):
    global stop_requested
    logger.info("Received signal %s, stopping after the current job", signum)
    stop_requested = True


def process_next() -> None:
    job = programQueue.receive()
    if job is None:
        return

    # At-least-once delivery: a duplicate or an expired job is acked and dropped
    if not programJobs.is_pending(job.job_id):
        programQueue.ack(job)
        return

    try:
        program = generate_program(ProgramOptions(**job.options))
    except Exception:
        logger.exception("Generating job %s failed (attempt %d)", job.job_id, job.receive_count)
        if job.receive_count >= MAX_ATTEMPTS:
            programJobs.fail_job(job.job_id)
            programQueue.ack(job)
        # Otherwise the message stays unacked and SQS redelivers it after the visibility timeout
        return

    programJobs.complete_job(job.job_id, program.model_dump())
    programQueue.ack(job)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    signal.signal(signal.SIGTERM, _request_stop)
    signal.signal(signal.SIGINT, _request_stop)

    logger.info("Program generation worker started")
    while not stop_requested:
        try:
            process_next()
        except Exception:
            # A Redis or SQS outage shouldn't kill the worker; the unacked message comes back later
            logger.exception("Worker iteration failed")
            time.sleep(ERROR_BACKOFF_SECONDS)
    logger.info("Program generation worker stopped")


if __name__ == "__main__":
    main()
