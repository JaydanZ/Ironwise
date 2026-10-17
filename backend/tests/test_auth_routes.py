import bcrypt
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.routes import auth as auth_routes
from backend.utils.limiter import limiter
from backend.utils.passwords import hash_password, verify_password

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

EMAIL = "lifter@example.com"
PASSWORD = "correct-horse-battery"


class AuthTestClient(TestClient):
    inserted: list
    user: dict


@pytest.fixture
def client(monkeypatch):
    user = {"id": "user-1", "email": EMAIL, "username": "lifter", "password": hash_password(PASSWORD)}
    inserted = []

    def update_password(user_id, new_password):
        user["password"] = hash_password(new_password)

    monkeypatch.setattr(auth_routes, "find_user_by_email", lambda email: user if email == EMAIL else None)
    monkeypatch.setattr(auth_routes, "insert_user", inserted.append)
    monkeypatch.setattr(auth_routes, "update_user_password", update_password)
    monkeypatch.setattr(auth_routes.redis_client, "set", lambda *args, **kwargs: True)

    test_client = AuthTestClient(app)
    test_client.inserted, test_client.user = inserted, user
    return test_client


def register(client, password="a-strong-new-password", username="newlifter", email="new@example.com"):
    return client.post(REGISTER_URL, json={"username": username, "email": email, "password": password})


def login(client, password=PASSWORD, email=EMAIL):
    return client.post(LOGIN_URL, json={"email": email, "password": password})


## Register

@pytest.mark.parametrize("password", ["x" * 8, "€" * 30, "x" * 128], ids=["8 chars", "multibyte", "128 chars"])
def test_register_accepts_valid_passwords(client, password):
    assert register(client, password).status_code == 201
    assert len(client.inserted) == 1


@pytest.mark.parametrize("password", ["x" * 7, "x" * 129], ids=["too short", "too long"])
def test_register_rejects_passwords_outside_length_limits(client, password):
    assert register(client, password).status_code == 422
    assert client.inserted == []


def test_register_rejects_short_usernames(client):
    assert register(client, username="abc").status_code == 422
    assert client.inserted == []


def test_register_rejects_breached_passwords(client, breached_passwords):
    breached_passwords.add("password123")

    response = register(client, "password123")

    assert response.status_code == 400
    assert "breach" in response.json()["detail"]
    assert client.inserted == []


@pytest.mark.parametrize("password", ["NewLifter", "new@example.com", "NEW@EXAMPLE.COM"],
                         ids=["username", "email", "email any case"])
def test_register_rejects_passwords_matching_personal_info(client, password):
    response = register(client, password, username="newlifter", email="new@example.com")

    assert response.status_code == 400
    assert client.inserted == []


def test_register_rejects_email_local_part_as_password(client):
    assert register(client, "jordanlifts", email="jordanlifts@example.com").status_code == 400


def test_register_is_rate_limited_per_ip(client):
    statuses = [register(client, email=f"user{i}@example.com").status_code for i in range(6)]

    assert statuses[:5] == [201] * 5
    assert statuses[5] == 429


## Login

def test_login_succeeds_with_argon2_hash(client):
    response = login(client)

    assert response.status_code == 201
    assert client.user["password"].startswith("$argon2id$")


def test_login_upgrades_legacy_bcrypt_hash_to_argon2id(client):
    client.user["password"] = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(4)).decode()

    assert login(client).status_code == 201
    assert client.user["password"].startswith("$argon2id$")
    assert verify_password(PASSWORD, client.user["password"])


def test_login_does_not_enforce_new_password_rules(client):
    # Accounts created under older rules must still be able to sign in
    client.user["password"] = hash_password("short")

    assert login(client, "short").status_code == 201


@pytest.mark.parametrize("email, password", [(EMAIL, "wrong-password"), ("nobody@example.com", PASSWORD)],
                         ids=["wrong password", "unknown email"])
def test_login_failures_are_indistinguishable(client, email, password):
    response = login(client, password, email)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid Credentials"


def test_unknown_email_costs_a_hash_verification(client, hasher_spy):
    assert login(client, email="nobody@example.com").status_code == 401
    assert len(hasher_spy.verified) == 1


def test_account_locks_after_ten_failed_logins(client):
    for _ in range(10):
        assert login(client, "wrong-password").status_code == 401

    # Locked even with the right password, and from a fresh IP window
    limiter.reset()
    assert login(client).status_code == 429


def test_successful_login_clears_failed_attempts(client, login_attempts_redis):
    for _ in range(5):
        login(client, "wrong-password")

    assert login(client).status_code == 201
    assert login_attempts_redis.get(f"login:failures:{EMAIL}") is None


def test_login_is_rate_limited_per_ip(client):
    statuses = [login(client, "wrong-password", f"user{i}@example.com").status_code for i in range(11)]

    assert statuses[:10] == [401] * 10
    assert statuses[10] == 429
