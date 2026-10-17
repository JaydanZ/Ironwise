from typing import cast

from ..Database.redisClient import redis_client

MAX_FAILED_LOGINS = 10
LOCKOUT_WINDOW_SECONDS = 15 * 60


## Keyed by email, not user id, so unknown emails are throttled the same way and don't reveal anything
def _failures_key(email: str) -> str:
    return f"login:failures:{email.casefold()}"


def is_locked_out(email: str) -> bool:
    failures = redis_client.get(_failures_key(email))
    return failures is not None and int(cast(str, failures)) >= MAX_FAILED_LOGINS


def record_failed_login(email: str) -> None:
    key = _failures_key(email)
    # The window starts at the first failure; INCR keeps the existing TTL
    redis_client.set(key, 0, ex=LOCKOUT_WINDOW_SECONDS, nx=True)
    redis_client.incr(key)


def clear_failed_logins(email: str) -> None:
    redis_client.delete(_failures_key(email))
