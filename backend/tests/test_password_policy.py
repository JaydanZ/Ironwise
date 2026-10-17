import hashlib

import bcrypt
import httpx
import pytest

from backend.utils import passwordPolicy
from backend.utils.passwords import hash_password, needs_rehash, verify_password

real_is_password_breached = passwordPolicy.is_password_breached

PASSWORD = "correct-horse-battery"
SHA1 = hashlib.sha1(PASSWORD.encode()).hexdigest().upper()


## Hashing

def test_new_hashes_are_argon2id():
    stored = hash_password(PASSWORD)

    assert stored.startswith("$argon2id$")
    assert verify_password(PASSWORD, stored)
    assert not verify_password("wrong-password", stored)
    assert not needs_rehash(stored)


def test_legacy_bcrypt_hashes_verify_and_need_rehash():
    stored = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(4)).decode()

    assert verify_password(PASSWORD, stored)
    assert not verify_password("wrong-password", stored)
    assert needs_rehash(stored)


def test_long_password_against_bcrypt_hash_is_false_not_an_error():
    stored = bcrypt.hashpw(b"x" * 72, bcrypt.gensalt(4)).decode()

    assert not verify_password("x" * 73, stored)


def test_garbage_hash_does_not_verify():
    assert not verify_password(PASSWORD, "not-a-hash")


def test_missing_account_still_runs_a_full_verification(hasher_spy):
    assert not verify_password(PASSWORD, None)
    assert len(hasher_spy.verified) == 1 and hasher_spy.verified[0].startswith("$argon2id$")


## HIBP

class FakeResponse:
    def __init__(self, text, status_code=200):
        self.text, self.status_code = text, status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=httpx.Request("GET", "x"), response=None)  # type: ignore[arg-type]


@pytest.fixture
def hibp(monkeypatch):
    calls = []

    def respond_with(text="", status_code=200, error=None):
        def fake_get(url, **kwargs):
            calls.append({"url": url, **kwargs})
            if error:
                raise error
            return FakeResponse(text, status_code)
        monkeypatch.setattr(passwordPolicy.httpx, "get", fake_get)

    respond_with.calls = calls  # type: ignore[attr-defined]
    return respond_with


def test_only_the_hash_prefix_is_sent(hibp):
    hibp("")

    real_is_password_breached(PASSWORD)

    call = hibp.calls[0]
    assert call["url"].endswith(f"/range/{SHA1[:5]}")
    assert PASSWORD not in call["url"] and SHA1[5:] not in call["url"]
    assert call["headers"]["Add-Padding"] == "true"


def test_matching_suffix_is_breached(hibp):
    hibp(f"0000000000000000000000000000000000A:3\r\n{SHA1[5:]}:42\r\n")

    assert real_is_password_breached(PASSWORD)


def test_padding_rows_do_not_count(hibp):
    hibp(f"{SHA1[5:]}:0\r\n")

    assert not real_is_password_breached(PASSWORD)


def test_unlisted_password_is_not_breached(hibp):
    hibp("0000000000000000000000000000000000A:3\r\n")

    assert not real_is_password_breached(PASSWORD)


@pytest.mark.parametrize("kwargs", [
    {"error": httpx.ConnectTimeout("timed out")},
    {"status_code": 503},
], ids=["timeout", "server error"])
def test_hibp_outage_fails_open(hibp, kwargs):
    hibp(**kwargs)

    assert not real_is_password_breached(PASSWORD)
