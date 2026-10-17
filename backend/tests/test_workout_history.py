from types import SimpleNamespace

import jwt
import pytest
from fastapi.testclient import TestClient

from backend.Database import workouts as workouts_db
from backend.main import app
from backend.routes import workouts as workouts_routes
from backend.utils.workoutSearch import workout_matches


def auth_header(user_id):
    token = jwt.encode({"sub": user_id}, "test-jwt-secret-key-that-is-long-enough", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def workout(index, focus="Push", program="PPL", exercises=()):
    return {
        "id": f"workout-{index}",
        "completed_at": f"2026-10-{index + 1:02d}",
        "day": "Monday",
        "focus": focus,
        "is_completed": True,
        "workout_programs": {"program_name": program},
        "exercise_set_logs": [
            {"name": name, "exercise_order": 0, "set_number": 1, "reps": 5, "weight": 100, "weight_unit": "lb"}
            for name in exercises
        ],
    }


class FakeQuery:
    """Serves a fixed table: honours `in_("id", ...)` and `range`, and reports the exact count."""

    def __init__(self, table_rows, log):
        self.rows = table_rows
        self.log = log
        self.count_mode = None

    def select(self, columns, count=None):
        self.count_mode = count
        self.log.append(("select", count))
        return self

    def in_(self, column, values):
        self.rows = [row for row in self.rows if row[column] in values]
        self.log.append(("in", tuple(values)))
        return self

    def range(self, start, end):
        self.log.append(("range", start, end))
        self.rows = self.rows[start:end + 1]
        return self

    def __getattr__(self, name):
        return lambda *args, **kwargs: self

    def execute(self):
        return SimpleNamespace(data=self.rows, count=len(self.rows) if self.count_mode else None)


def fake_supabase(monkeypatch, table_rows):
    log = []
    monkeypatch.setattr(workouts_db, "supabase", SimpleNamespace(table=lambda name: FakeQuery(table_rows, log)))
    return log


def test_returns_one_page_with_the_total(monkeypatch):
    table = [workout(i) for i in range(12)]
    log = fake_supabase(monkeypatch, table)
    monkeypatch.setattr(FakeQuery, "execute", lambda self: SimpleNamespace(data=self.rows, count=len(table)))

    result = workouts_db.get_recent_workouts("user-1", limit=5, offset=5)

    assert result["success"] is True
    assert ("select", "exact") in log
    assert ("range", 5, 9) in log
    assert [w["id"] for w in result["data"]["workouts"]] == [f"workout-{i}" for i in range(5, 10)]
    assert result["data"]["total"] == 12
    assert result["data"]["has_more"] is True


def test_last_page_has_no_more(monkeypatch):
    table = [workout(i) for i in range(12)]
    fake_supabase(monkeypatch, table)
    monkeypatch.setattr(FakeQuery, "execute", lambda self: SimpleNamespace(data=self.rows, count=len(table)))

    result = workouts_db.get_recent_workouts("user-1", limit=5, offset=10)

    assert len(result["data"]["workouts"]) == 2
    assert result["data"]["has_more"] is False


@pytest.mark.parametrize("terms", [["push"], ["mon"], ["ppl"], ["bench"], ["bench", "push"]])
def test_matches_title_day_program_and_exercises(terms):
    assert workout_matches(workout(0, exercises=["Bench Press"]), terms)


def test_every_term_must_match():
    assert not workout_matches(workout(0, exercises=["Bench Press"]), ["bench", "squat"])


def test_handles_missing_program_and_exercises():
    row = {"id": "w", "day": None, "focus": None, "workout_programs": None, "exercise_set_logs": None}
    assert not workout_matches(row, ["push"])


def test_search_pages_through_matches_only(monkeypatch):
    table = [workout(i, exercises=["Bench Press"] if i % 2 == 0 else ["Squat"]) for i in range(10)]
    log = fake_supabase(monkeypatch, table)

    result = workouts_db.get_recent_workouts("user-1", limit=2, offset=2, terms=["bench"])

    assert [w["id"] for w in result["data"]["workouts"]] == ["workout-4", "workout-6"]
    assert result["data"]["total"] == 5
    assert result["data"]["has_more"] is True
    assert ("in", ("workout-4", "workout-6")) in log


def test_search_past_the_last_match_is_empty(monkeypatch):
    fake_supabase(monkeypatch, [workout(0, exercises=["Squat"])])

    result = workouts_db.get_recent_workouts("user-1", limit=5, offset=0, terms=["bench"])

    assert result["data"] == {"workouts": [], "total": 0, "has_more": False}


@pytest.fixture
def client(monkeypatch):
    calls = []

    def fake_recent(user_id, limit, offset, terms):
        calls.append({"user_id": user_id, "limit": limit, "offset": offset, "terms": terms})
        return {"success": True, "data": {"workouts": [], "total": 0, "has_more": False}}

    monkeypatch.setattr(workouts_routes, "get_recent_workouts", fake_recent)
    test_client = TestClient(app)
    test_client.calls = calls
    return test_client


def test_passes_search_terms_to_the_query(client):
    response = client.get("/api/v1/workouts?limit=5&offset=10&q=Bench%20%20Push", headers=auth_header("user-1"))

    assert response.status_code == 200
    assert client.calls == [{"user_id": "user-1", "limit": 5, "offset": 10, "terms": ["bench", "push"]}]


def test_rejects_an_overlong_search(client):
    response = client.get("/api/v1/workouts?q=" + "x" * 101, headers=auth_header("user-1"))

    assert response.status_code == 422
    assert client.calls == []
