import os

import fakeredis
import pytest

# Settings are read when the app is imported, so fake ones must exist first.
TEST_ENV = {
    "CLIENT_URL": "http://localhost:5173",
    "REDIS_HOST": "localhost",
    "JWT_SECRET_KEY": "test-jwt-secret-key-that-is-long-enough",
    "JWT_REFRESH_SECRET": "test-refresh-secret-key-that-is-long-enough",
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2.test",
    "OPENAI_API_KEY": "sk-test",
    "RESEND_API_KEY": "re_test",
    "EMAIL_FROM": "Ironwise <test@example.com>",
    "AWS_REGION": "us-east-1",
    # Empty, not absent: backend/.env would otherwise point tests at a running ElasticMQ
    "SQS_ENDPOINT_URL": "",
    "PROGRAM_QUEUE_URL": "https://sqs.us-east-1.amazonaws.com/123456789012/program-generation",
    "AWS_ACCESS_KEY_ID": "testing",
    "AWS_SECRET_ACCESS_KEY": "testing",
}
for name, value in TEST_ENV.items():
    os.environ[name] = value



## Tests add to this set to make a password count as breached; HIBP is never called
@pytest.fixture(autouse=True)
def breached_passwords(monkeypatch):
    from backend.utils import passwordPolicy

    breached: set[str] = set()
    monkeypatch.setattr(passwordPolicy, "is_password_breached", lambda password: password in breached)
    return breached


@pytest.fixture(autouse=True)
def login_attempts_redis(monkeypatch):
    from backend.utils import loginAttempts
    from backend.utils.limiter import limiter

    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(loginAttempts, "redis_client", fake)
    limiter.reset()
    return fake


class SpyHasher:
    def __init__(self, real):
        self.real, self.verified = real, []

    def verify(self, stored, password):
        self.verified.append(stored)
        return self.real.verify(stored, password)


## Records every Argon2 verification while still running the real one
@pytest.fixture
def hasher_spy(monkeypatch):
    from backend.utils import passwords

    spy = SpyHasher(passwords._hasher)
    monkeypatch.setattr(passwords, "_hasher", spy)
    return spy
