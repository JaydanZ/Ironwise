import hashlib
import hmac
import secrets
from typing import cast

from ..config import get_settings
from ..Database.redisClient import redis_client

CODE_TTL_SECONDS = 15 * 60
MAX_CODE_ATTEMPTS = 5
MAX_CODE_REQUESTS_PER_HOUR = 3
RESET_TOKEN_TTL_SECONDS = 10 * 60

HASH_KEY = get_settings().JWT_SECRET_KEY.encode("utf-8")


def _code_key(user_id: str) -> str:
    return f"pwreset:code:{user_id}"

def _attempts_key(user_id: str) -> str:
    return f"pwreset:attempts:{user_id}"

def _requests_key(user_id: str) -> str:
    return f"pwreset:requests:{user_id}"

def _token_key(token: str) -> str:
    return f"pwreset:token:{token}"

## The client is created synchronously
def _incr(key: str) -> int:
    return cast(int, redis_client.incr(key))


## Keyed hash: a plain hash of a six-digit code is reversible by trying all 1,000,000
def _hash_code(user_id: str, code: str) -> str:
    return hmac.new(HASH_KEY, f"{user_id}:{code}".encode("utf-8"), hashlib.sha256).hexdigest()


## Returns a new code, or None when the user has hit the hourly request limit
def issue_code(user_id: str) -> str | None:
    requests_key = _requests_key(user_id)
    # The window starts at the first request; INCR keeps the existing TTL
    redis_client.set(requests_key, 0, ex=3600, nx=True)
    if _incr(requests_key) > MAX_CODE_REQUESTS_PER_HOUR:
        return None

    code = f"{secrets.randbelow(1_000_000):06d}"
    redis_client.set(_code_key(user_id), _hash_code(user_id, code), ex=CODE_TTL_SECONDS)
    redis_client.delete(_attempts_key(user_id))
    return code


## Every guess counts before comparing, so parallel requests can't exceed the limit
def check_code(user_id: str, code: str) -> bool:
    code_key, attempts_key = _code_key(user_id), _attempts_key(user_id)
    stored = redis_client.get(code_key)
    if stored is None:
        return False

    attempts = _incr(attempts_key)
    if attempts == 1:
        redis_client.expire(attempts_key, CODE_TTL_SECONDS)
    if attempts > MAX_CODE_ATTEMPTS:
        redis_client.delete(code_key, attempts_key)
        return False

    if not hmac.compare_digest(str(stored), _hash_code(user_id, code)):
        if attempts == MAX_CODE_ATTEMPTS:
            redis_client.delete(code_key, attempts_key)
        return False

    return cast(int, redis_client.delete(code_key)) == 1


def issue_reset_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    redis_client.set(_token_key(token), user_id, ex=RESET_TOKEN_TTL_SECONDS)
    return token


def peek_reset_token(token: str) -> str | None:
    return cast(str | None, redis_client.get(_token_key(token)))


def consume_reset_token(token: str) -> str | None:
    return cast(str | None, redis_client.getdel(_token_key(token)))


def revoke_sessions(user_id: str) -> None:
    redis_client.delete(str(user_id))
