import secrets

import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()

BCRYPT_MAX_BYTES = 72

_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(32))


def _is_legacy_bcrypt(stored_hash: str) -> bool:
    return stored_hash.startswith("$2")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


## Pass None when no account matched: a full verification still runs, so a missing account takes as long as a wrong password
def verify_password(password: str, stored_hash: str | None) -> bool:
    if stored_hash is None:
        _verify_argon2(password, _DUMMY_HASH)
        return False

    if _is_legacy_bcrypt(stored_hash):
        encoded = password.encode("utf-8")
        ## bcrypt raises on input over 72 bytes, and no bcrypt-era password was longer
        if len(encoded) > BCRYPT_MAX_BYTES:
            return False
        return bcrypt.checkpw(encoded, stored_hash.encode("utf-8"))

    return _verify_argon2(password, stored_hash)


def _verify_argon2(password: str, stored_hash: str) -> bool:
    try:
        return _hasher.verify(stored_hash, password)
    except (VerificationError, InvalidHashError):
        return False


## True for bcrypt hashes and for Argon2 hashes made with weaker parameters than the current ones
def needs_rehash(stored_hash: str) -> bool:
    return _is_legacy_bcrypt(stored_hash) or _hasher.check_needs_rehash(stored_hash)
