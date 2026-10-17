from datetime import date
from typing import Dict, Any
from ..models.workouts import WorkoutSubmission
from ..utils.lifts import group_lift_sets
from ..utils.workoutSearch import workout_matches
from .supabase import supabase
import ast

def log_workout(user_id: str, submission: WorkoutSubmission) -> Dict[str, Any]:
    try:
        sets = [
            {
                "name": s.exercise_name,
                "exercise_order": s.exercise_order,
                "set_number": s.set_number,
                "reps": s.reps,
                "weight": str(s.weight) if s.weight is not None else None,
                "weight_unit": s.weight_unit,
                "notes": s.notes.strip() if s.notes and s.notes.strip() else None
            }
            for s in submission.sets
        ]
        response = supabase.rpc("log_workout", {
            "p_user_id": user_id,
            "p_program_id": submission.program_id,
            "p_date": submission.performed_on.isoformat(),
            "p_day": submission.day,
            "p_focus": submission.focus,
            "p_is_completed": submission.is_completed,
            "p_sets": sets
        }).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def has_workout_on(user_id: str, on: date) -> bool:
    response = (
        supabase.table("completed_workouts")
        .select("id")
        .eq("user_id", user_id)
        .eq("completed_at", on.isoformat())
        .execute()
    )
    return bool(response.data)

def get_last_workout_date(user_id: str, before: date) -> date | None:
    response = (
        supabase.table("completed_workouts")
        .select("completed_at")
        .eq("user_id", user_id)
        .lt("completed_at", before.isoformat())
        .order("completed_at", desc=True)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    data = ast.literal_eval(str(response.data))
    return date.fromisoformat(data[0]["completed_at"])

def get_workout_history(user_id: str, since: date) -> list[Dict[str, Any]]:
    response = (
        supabase.table("completed_workouts")
        .select("completed_at, program_id")
        .eq("user_id", user_id)
        .gte("completed_at", since.isoformat())
        .order("completed_at")
        .execute()
    )
    
    history: Dict[str, Dict[str, Any]] = {}
    data = ast.literal_eval(str(response.data))
    for row in data or []:
        history[row["completed_at"]] = {
            "date": row["completed_at"],
            "has_worked_out": True,
            "program_link": row["program_id"]
        }
    return list(history.values())

def get_previous_performance(user_id: str, names: list[str], until: date) -> Dict[str, Any]:
    try:
        # Includes `until` itself, so a session already logged today counts as the last time
        response = (
            supabase.table("exercise_set_logs")
            .select("name, set_number, reps, weight, weight_unit, completed_workouts!inner(user_id, completed_at)")
            .in_("name", names)
            .eq("completed_workouts.user_id", user_id)
            .lte("completed_workouts.completed_at", until.isoformat())
            .execute()
        )
        data = ast.literal_eval(str(response.data))

        latest: Dict[str, Dict[str, Any]] = {}
        for row in data or []:
            performed_on = row["completed_workouts"]["completed_at"]
            entry = latest.get(row["name"])
            if entry is None or performed_on > entry["date"]:
                entry = {"date": performed_on, "sets": []}
                latest[row["name"]] = entry
            elif performed_on < entry["date"]:
                continue
            entry["sets"].append({
                "set_number": row["set_number"],
                "reps": row["reps"],
                "weight": float(row["weight"]) if row["weight"] is not None else None,
                "weight_unit": row["weight_unit"]
            })

        for entry in latest.values():
            entry["sets"].sort(key=lambda s: s["set_number"])

        return {"success": True, "data": latest}
    except Exception as e:
        return {"success": False, "error": str(e)}

LIFT_PAGE_SIZE = 1000
LIFT_MAX_PAGES = 20

def get_lift_history(user_id: str, since: date) -> Dict[str, Any]:
    try:
        rows: list[Dict[str, Any]] = []
        for page in range(LIFT_MAX_PAGES):
            start = page * LIFT_PAGE_SIZE
            response = (
                supabase.table("exercise_set_logs")
                .select("name, reps, weight, weight_unit, completed_workouts!inner(user_id, completed_at)")
                .eq("completed_workouts.user_id", user_id)
                .gte("completed_workouts.completed_at", since.isoformat())
                .gt("weight", 0)
                .gt("reps", 0)
                .order("id")
                .range(start, start + LIFT_PAGE_SIZE - 1)
                .execute()
            )
            batch = ast.literal_eval(str(response.data)) or []
            rows.extend(batch)
            if len(batch) < LIFT_PAGE_SIZE:
                break

        return {"success": True, "data": group_lift_sets(rows)}
    except Exception as e:
        return {"success": False, "error": str(e)}

HISTORY_COLUMNS = (
    "id, completed_at, day, focus, is_completed, "
    "workout_programs(program_name), "
    "exercise_set_logs(name, exercise_order, set_number, reps, weight, weight_unit)"
)
SEARCH_COLUMNS = "id, day, focus, workout_programs(program_name), exercise_set_logs(name)"
SEARCH_PAGE_SIZE = 1000
SEARCH_MAX_PAGES = 10

def _to_history_entry(row: Dict[str, Any]) -> Dict[str, Any]:
    exercises: Dict[tuple, Dict[str, Any]] = {}
    for s in sorted(
        row.get("exercise_set_logs") or [],
        key=lambda s: (s.get("exercise_order") or 0, s["set_number"])
    ):
        key = (s.get("exercise_order") or 0, s["name"])
        exercise = exercises.setdefault(key, {"name": s["name"], "sets": []})
        exercise["sets"].append({
            "set_number": s["set_number"],
            "reps": s["reps"],
            "weight": float(s["weight"]) if s["weight"] is not None else None,
            "weight_unit": s["weight_unit"]
        })

    program = row.get("workout_programs") or {}
    return {
        "id": row["id"],
        "date": row["completed_at"],
        "day": row.get("day"),
        "focus": row.get("focus"),
        "program_name": program.get("program_name"),
        "is_completed": bool(row.get("is_completed")),
        "exercises": list(exercises.values())
    }

def _newest_first(query):
    return query.order("completed_at", desc=True).order("id", desc=True)

# PostgREST can't OR an ilike across embedded tables, so matching happens here
def _matching_workout_ids(user_id: str, terms: list[str]) -> list[str]:
    ids: list[str] = []
    for page in range(SEARCH_MAX_PAGES):
        start = page * SEARCH_PAGE_SIZE
        response = _newest_first(
            supabase.table("completed_workouts")
            .select(SEARCH_COLUMNS)
            .eq("user_id", user_id)
        ).range(start, start + SEARCH_PAGE_SIZE - 1).execute()
        batch = ast.literal_eval(str(response.data)) or []
        ids.extend(row["id"] for row in batch if workout_matches(row, terms))
        if len(batch) < SEARCH_PAGE_SIZE:
            break
    return ids

def _search_workouts(user_id: str, limit: int, offset: int, terms: list[str]) -> tuple[list, int]:
    ids = _matching_workout_ids(user_id, terms)
    page_ids = ids[offset:offset + limit]
    if not page_ids:
        return [], len(ids)
    response = _newest_first(
        supabase.table("completed_workouts")
        .select(HISTORY_COLUMNS)
        .eq("user_id", user_id)
        .in_("id", page_ids)
    ).execute()
    return ast.literal_eval(str(response.data)) or [], len(ids)

def get_recent_workouts(user_id: str, limit: int, offset: int, terms: list[str] | None = None) -> Dict[str, Any]:
    try:
        if terms:
            rows, total = _search_workouts(user_id, limit, offset, terms)
        else:
            response = _newest_first(
                supabase.table("completed_workouts")
                .select(HISTORY_COLUMNS, count="exact")
                .eq("user_id", user_id)
            ).range(offset, offset + limit - 1).execute()
            rows = ast.literal_eval(str(response.data)) or []
            total = response.count or 0

        return {
            "success": True,
            "data": {
                "workouts": [_to_history_entry(row) for row in rows[:limit]],
                "total": total,
                "has_more": offset + len(rows) < total
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
