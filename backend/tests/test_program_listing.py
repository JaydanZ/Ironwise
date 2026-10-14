import jwt
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.routes import programs as programs_routes
from backend.utils.programs import (
    escape_like,
    plan_program_page,
    program_search_terms,
    to_program_summary,
)

PROGRAM_ID = "6f1c2c1e-8d0a-4c6b-9a43-2f7d5c1b9e10"


def auth_header(user_id):
    token = jwt.encode({"sub": user_id}, "test-jwt-secret-key-that-is-long-enough", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def place(page, limit, total, pin_active):
    """Expand a page plan into the list positions it covers (0 = active program)."""
    plan = plan_program_page(page, limit, pin_active)
    shift = 1 if pin_active else 0
    others = [shift + plan["offset"] + i for i in range(plan["size"]) if shift + plan["offset"] + i < total]
    return ([0] if plan["include_active"] else []) + others


@pytest.mark.parametrize("pin_active", [True, False])
def test_page_plans_cover_every_program_exactly_once(pin_active):
    total, limit = 13, 5

    positions = [p for page in range(3) for p in place(page, limit, total, pin_active)]

    assert positions == list(range(total))


def test_active_program_takes_the_first_slot_of_the_first_page():
    assert plan_program_page(0, 5, pin_active=True) == {"include_active": True, "offset": 0, "size": 4}
    assert plan_program_page(1, 5, pin_active=True) == {"include_active": False, "offset": 4, "size": 5}


def test_search_terms_are_lowercased_words_capped_in_number():
    assert program_search_terms("  Push   PULL ", 8) == ["push", "pull"]
    assert program_search_terms(None, 8) == []
    assert program_search_terms("a b c", 2) == ["a", "b"]


def test_like_wildcards_in_search_terms_are_literal():
    assert escape_like("100%_back\\") == r"100\%\_back\\"


def test_summary_counts_days_without_sending_the_structure():
    row = {"id": "p1", "program_name": "PPL", "program_structure": [{}, {}, {}], "updated_at": "now"}

    assert to_program_summary(row, is_active=True) == {
        "id": "p1",
        "program_name": "PPL",
        "day_count": 3,
        "is_active": True,
        "updated_at": "now",
    }


@pytest.fixture
def client(monkeypatch):
    calls = []

    def fake_page(user_id, active_program_id, page, limit, terms):
        calls.append({"user_id": user_id, "active": active_program_id, "page": page, "limit": limit, "terms": terms})
        return {"success": True, "data": {"items": [], "total": 0, "page": page, "limit": limit}}

    monkeypatch.setattr(programs_routes, "get_program_summaries_page", fake_page)
    monkeypatch.setattr(programs_routes, "find_user_by_id", lambda user_id: {"id": user_id, "active_program": PROGRAM_ID})

    test_client = TestClient(app)
    test_client.calls = calls
    return test_client


def test_lists_a_page_of_the_users_programs(client):
    response = client.get("/api/v1/programs?page=2&limit=5&q=Push%20Legs", headers=auth_header("user-1"))

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "page": 2, "limit": 5}
    assert client.calls == [{"user_id": "user-1", "active": PROGRAM_ID, "page": 2, "limit": 5, "terms": ["push", "legs"]}]


@pytest.mark.parametrize("query", ["page=-1", "limit=0", "limit=51", "q=" + "x" * 61])
def test_rejects_out_of_range_listing_params(client, query):
    response = client.get(f"/api/v1/programs?{query}", headers=auth_header("user-1"))

    assert response.status_code == 422
    assert client.calls == []


def test_listing_requires_authentication(client):
    assert client.get("/api/v1/programs").status_code == 401


def test_gets_a_single_owned_program(client, monkeypatch):
    program = {"id": PROGRAM_ID, "user_id": "user-1", "program_name": "PPL"}
    monkeypatch.setattr(programs_routes, "get_owned_program", lambda program_id, user_id: program if user_id == "user-1" else None)

    assert client.get(f"/api/v1/programs/{PROGRAM_ID}", headers=auth_header("user-1")).json() == program
    assert client.get(f"/api/v1/programs/{PROGRAM_ID}", headers=auth_header("user-2")).status_code == 404
