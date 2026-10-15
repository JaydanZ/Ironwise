from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest
from fastapi.testclient import TestClient

from backend.Database import workouts as workouts_db
from backend.main import app
from backend.routes import workouts as workouts_routes
from backend.utils.lifts import group_lift_sets


def auth_header(user_id):
    token = jwt.encode({"sub": user_id}, "test-jwt-secret-key-that-is-long-enough", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def row(performed_on, name, reps, weight, unit="lb"):
    return {
        "name": name,
        "reps": reps,
        "weight": weight,
        "weight_unit": unit,
        "completed_workouts": {"user_id": "user-1", "completed_at": performed_on},
    }


def test_groups_sets_by_date_then_exercise_oldest_first():
    grouped = group_lift_sets([
        row("2026-10-05", "Squat", 5, "225.00"),
        row("2026-09-28", "Bench", 8, 135),
        row("2026-10-05", "Bench", 8, "140.50", "kg"),
        row("2026-10-05", "Squat", 3, 245),
    ])

    assert grouped == [
        {"date": "2026-09-28", "exercises": [
            {"name": "Bench", "sets": [{"reps": 8, "weight": 135.0, "weight_unit": "lb"}]},
        ]},
        {"date": "2026-10-05", "exercises": [
            {"name": "Squat", "sets": [
                {"reps": 5, "weight": 225.0, "weight_unit": "lb"},
                {"reps": 3, "weight": 245.0, "weight_unit": "lb"},
            ]},
            {"name": "Bench", "sets": [{"reps": 8, "weight": 140.5, "weight_unit": "kg"}]},
        ]},
    ]


def test_groups_nothing_into_an_empty_list():
    assert group_lift_sets([]) == []


class FakeQuery:
    """Records the requested ranges and serves rows from a fixed table."""

    def __init__(self, table_rows):
        self.table_rows = table_rows
        self.ranges = []
        self.filters = []

    def __getattr__(self, name):
        def chain(*args):
            self.filters.append((name, args))
            return self
        return chain

    def range(self, start, end):
        self.ranges.append((start, end))
        self._slice = self.table_rows[start:end + 1]
        return self

    def execute(self):
        return SimpleNamespace(data=self._slice)


def fake_supabase(monkeypatch, table_rows):
    query = FakeQuery(table_rows)
    monkeypatch.setattr(workouts_db, "supabase", SimpleNamespace(table=lambda name: query))
    return query


def test_reads_every_page_past_the_row_cap(monkeypatch):
    monkeypatch.setattr(workouts_db, "LIFT_PAGE_SIZE", 2)
    rows = [row(f"2026-10-0{i + 1}", "Squat", 5, 200 + i) for i in range(5)]
    query = fake_supabase(monkeypatch, rows)

    result = workouts_db.get_lift_history("user-1", date(2025, 10, 15))

    assert result["success"] is True
    assert query.ranges == [(0, 1), (2, 3), (4, 5)]
    assert [entry["date"] for entry in result["data"]] == [r["completed_workouts"]["completed_at"] for r in rows]
    assert ("eq", ("completed_workouts.user_id", "user-1")) in query.filters
    assert ("gte", ("completed_workouts.completed_at", "2025-10-15")) in query.filters


def test_stops_after_a_full_final_page_comes_back_empty(monkeypatch):
    monkeypatch.setattr(workouts_db, "LIFT_PAGE_SIZE", 2)
    query = fake_supabase(monkeypatch, [row("2026-10-01", "Squat", 5, 200)] * 4)

    workouts_db.get_lift_history("user-1", date(2025, 10, 15))

    assert query.ranges == [(0, 1), (2, 3), (4, 5)]


def test_page_count_is_bounded(monkeypatch):
    monkeypatch.setattr(workouts_db, "LIFT_PAGE_SIZE", 1)
    monkeypatch.setattr(workouts_db, "LIFT_MAX_PAGES", 3)
    query = fake_supabase(monkeypatch, [row("2026-10-01", "Squat", 5, 200)] * 10)

    workouts_db.get_lift_history("user-1", date(2025, 10, 15))

    assert len(query.ranges) == 3


@pytest.fixture
def client(monkeypatch):
    calls = []

    def fake_history(user_id, since):
        calls.append({"user_id": user_id, "since": since})
        return {"success": True, "data": [{"date": "2026-10-01", "exercises": []}]}

    monkeypatch.setattr(workouts_routes, "get_lift_history", fake_history)
    test_client = TestClient(app)
    test_client.calls = calls
    return test_client


def test_returns_a_year_of_lift_history_for_the_caller(client):
    response = client.get("/api/v1/workouts/lift-history", headers=auth_header("user-1"))

    assert response.status_code == 200
    assert response.json() == [{"date": "2026-10-01", "exercises": []}]
    expected_since = datetime.now(timezone.utc).date() - timedelta(days=365)
    assert client.calls == [{"user_id": "user-1", "since": expected_since}]


def test_lift_history_requires_authentication(client):
    assert client.get("/api/v1/workouts/lift-history").status_code == 401
    assert client.calls == []


def test_lift_history_failure_is_a_500(client, monkeypatch):
    monkeypatch.setattr(workouts_routes, "get_lift_history", lambda user_id, since: {"success": False, "error": "boom"})

    assert client.get("/api/v1/workouts/lift-history", headers=auth_header("user-1")).status_code == 500
