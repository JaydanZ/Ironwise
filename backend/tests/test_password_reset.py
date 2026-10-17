import fakeredis
import jwt
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.routes import auth as auth_routes
from backend.routes import users as users_routes
from backend.utils import passwordReset
from backend.utils.limiter import limiter
from backend.utils.passwords import hash_password, verify_password

USER_ID = "user-1"
EMAIL = "lifter@example.com"
OLD_PASSWORD = "old-password"
NEW_PASSWORD = "new-password"

REQUEST_URL = "/api/v1/auth/password-reset/request"
VERIFY_URL = "/api/v1/auth/password-reset/verify"
CONFIRM_URL = "/api/v1/auth/password-reset/confirm"
CHANGE_URL = "/api/v1/users/me/password"


class ResetTestClient(TestClient):
    user: dict
    codes: list[str]
    notices: list[str]


def auth_header(user_id=USER_ID):
    token = jwt.encode({"sub": user_id}, "test-jwt-secret-key-that-is-long-enough", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def redis(monkeypatch):
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(passwordReset, "redis_client", fake)
    monkeypatch.setattr(users_routes, "redis_client", fake)
    return fake


@pytest.fixture
def client(monkeypatch, redis):
    user = {
        "id": USER_ID,
        "email": EMAIL,
        "username": "ironlifter",
        "password": hash_password(OLD_PASSWORD),
    }
    codes, notices = [], []

    def find_by_email(email):
        return user if email == EMAIL else None

    def find_by_id(user_id):
        return user if user_id == USER_ID else None

    def update_password(user_id, new_password):
        user["password"] = hash_password(new_password)

    for module in (auth_routes, users_routes):
        monkeypatch.setattr(module, "find_user_by_id", find_by_id)
        monkeypatch.setattr(module, "update_user_password", update_password)
        monkeypatch.setattr(module, "send_password_changed_email", lambda to, name: notices.append(to))
    monkeypatch.setattr(auth_routes, "find_user_by_email", find_by_email)
    monkeypatch.setattr(
        auth_routes, "send_reset_code_email", lambda to, name, code, minutes: codes.append(code)
    )
    limiter.reset()

    test_client = ResetTestClient(app)
    test_client.user, test_client.codes, test_client.notices = user, codes, notices
    return test_client


def password_matches(client, password):
    return verify_password(password, client.user["password"])


def request_code(client, email=EMAIL):
    return client.post(REQUEST_URL, json={"email": email})


def verify(client, code, email=EMAIL):
    return client.post(VERIFY_URL, json={"email": email, "code": code})


def confirm(client, token, password=NEW_PASSWORD, confirm_password=None):
    return client.post(CONFIRM_URL, json={
        "reset_token": token,
        "new_password": password,
        "confirm_password": password if confirm_password is None else confirm_password,
    })


def wrong_code(code):
    return f"{(int(code) + 1) % 1_000_000:06d}"


## Request

def test_unknown_and_known_emails_get_the_same_reply(client):
    known = request_code(client)
    unknown = request_code(client, "nobody@example.com")

    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert len(client.codes) == 1


def test_code_expires_after_fifteen_minutes(client, redis):
    request_code(client)

    assert 0 < redis.ttl(f"pwreset:code:{USER_ID}") <= 15 * 60


def test_fourth_request_in_an_hour_sends_nothing(client):
    for _ in range(4):
        assert request_code(client).status_code == 200

    assert len(client.codes) == 3


def test_new_code_replaces_the_old_one(client):
    request_code(client)
    request_code(client)
    old_code, new_code = client.codes

    if old_code != new_code:
        assert verify(client, old_code).status_code == 400
    assert verify(client, new_code).status_code == 200


def test_request_is_rate_limited_per_ip(client):
    statuses = [request_code(client, f"user{i}@example.com").status_code for i in range(6)]

    assert statuses[:5] == [200] * 5
    assert statuses[5] == 429


## Verify

def test_correct_code_returns_a_reset_token_once(client):
    request_code(client)
    code = client.codes[0]

    response = verify(client, code)

    assert response.status_code == 200
    assert response.json()["reset_token"]
    assert verify(client, code).status_code == 400


def test_fifth_wrong_guess_kills_the_code(client):
    request_code(client)
    code = client.codes[0]

    for _ in range(5):
        assert verify(client, wrong_code(code)).status_code == 400

    assert verify(client, code).status_code == 400


def test_expired_code_is_rejected(client, redis):
    request_code(client)
    redis.delete(f"pwreset:code:{USER_ID}")

    assert verify(client, client.codes[0]).status_code == 400


def test_unknown_email_cannot_verify(client):
    assert verify(client, "123456", "nobody@example.com").status_code == 400


## Confirm

def reset_token(client):
    request_code(client)
    return verify(client, client.codes[0]).json()["reset_token"]


def test_confirm_updates_password_revokes_sessions_and_notifies(client, redis):
    redis.set(USER_ID, "existing-refresh-token")
    token = reset_token(client)

    response = confirm(client, token)

    assert response.status_code == 200
    assert password_matches(client, NEW_PASSWORD)
    assert redis.get(USER_ID) is None
    assert client.notices == [EMAIL]


def test_reset_token_is_single_use(client):
    token = reset_token(client)

    assert confirm(client, token).status_code == 200
    assert confirm(client, token, password="another-password").status_code == 400


def test_reset_token_expires_after_ten_minutes(client, redis):
    token = reset_token(client)

    assert 0 < redis.ttl(f"pwreset:token:{token}") <= 10 * 60


@pytest.mark.parametrize("password, confirm_password", [
    ("short", None),
    ("x" * 129, None),
    (NEW_PASSWORD, "different-password"),
], ids=["too short", "over 128 chars", "mismatch"])
def test_invalid_new_password_is_rejected_without_using_the_token(client, password, confirm_password):
    token = reset_token(client)

    assert confirm(client, token, password, confirm_password).status_code == 422
    assert password_matches(client, OLD_PASSWORD)
    assert confirm(client, token).status_code == 200


@pytest.mark.parametrize("password", ["breached-password", "IronLifter", EMAIL], ids=["breached", "username", "email"])
def test_weak_new_password_is_rejected_without_using_the_token(client, breached_passwords, password):
    breached_passwords.add("breached-password")
    token = reset_token(client)

    assert confirm(client, token, password).status_code == 400
    assert password_matches(client, OLD_PASSWORD)
    assert confirm(client, token).status_code == 200


## Change password

def change_password(client, old=OLD_PASSWORD, new=NEW_PASSWORD, user_id=USER_ID):
    return client.put(
        CHANGE_URL,
        json={"old_password": old, "new_password": new, "confirm_password": new},
        headers=auth_header(user_id),
    )


def test_change_password_issues_a_fresh_session(client, redis):
    redis.set(USER_ID, "other-device-refresh-token")

    response = change_password(client)

    assert response.status_code == 200
    body = response.json()
    assert password_matches(client, NEW_PASSWORD)
    assert redis.get(USER_ID) == body["refresh_token_data"] != "other-device-refresh-token"
    assert body["token_data"]["access_token"]
    assert client.notices == [EMAIL]


def test_wrong_old_password_is_rejected(client):
    response = change_password(client, old="not-my-password")

    assert response.status_code == 400
    assert password_matches(client, OLD_PASSWORD)
    assert client.notices == []


def test_change_password_requires_login(client):
    response = client.put(CHANGE_URL, json={
        "old_password": OLD_PASSWORD, "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD,
    })

    assert response.status_code == 401


def test_change_password_is_rate_limited_per_user(client):
    statuses = [change_password(client, old="not-my-password").status_code for _ in range(6)]

    assert statuses[:5] == [400] * 5
    assert statuses[5] == 429


@pytest.mark.parametrize("password", ["breached-password", "IronLifter"], ids=["breached", "username"])
def test_change_password_rejects_weak_new_password(client, breached_passwords, password):
    breached_passwords.add("breached-password")

    response = change_password(client, new=password)

    assert response.status_code == 400
    assert password_matches(client, OLD_PASSWORD)
    assert client.notices == []
