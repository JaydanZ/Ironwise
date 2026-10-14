from typing import List, Dict, Any
from ..Database.supabase import supabase
from ..models.programs import Workout, Exercise

def _convert_workouts_to_json(workouts: List[Workout]) -> List[Dict[str, Any]]:
    result = []
    for workout in workouts:
        workout_dict = {
            "day": workout.day,
            "focus": workout.focus,
            "exercises": _convert_exercises_to_json(workout.exercises)
        }
        result.append(workout_dict)
    return result


def _convert_exercises_to_json(exercises: List[Exercise]) -> List[Dict[str, Any]]:
    result = []
    for exercise in exercises:
        exercise_dict = {
            "exercise_tip": exercise.exercise_tip,
            "name": exercise.name,
            "sets": exercise.sets,
            "reps": exercise.reps
        }
        result.append(exercise_dict)
    return result


def program_search_terms(query: str | None, max_terms: int) -> List[str]:
    return (query or "").lower().split()[:max_terms]


def escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")


def plan_program_page(page: int, limit: int, pin_active: bool) -> Dict[str, Any]:
    """Map a page of the active-first program list onto the other programs.
    """
    start = page * limit
    if not pin_active:
        return {"include_active": False, "offset": start, "size": limit}
    if page == 0:
        return {"include_active": True, "offset": 0, "size": limit - 1}
    return {"include_active": False, "offset": start - 1, "size": limit}


def to_program_summary(row: Dict[str, Any], is_active: bool) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "program_name": row["program_name"],
        "day_count": len(row.get("program_structure") or []),
        "is_active": is_active,
        "updated_at": row.get("updated_at"),
    }
