from typing import Any, Dict

def group_lift_sets(rows: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Group flat set rows into one entry per workout date, oldest first."""
    by_date: Dict[str, Dict[str, list]] = {}
    for row in rows:
        performed_on = row["completed_workouts"]["completed_at"]
        exercises = by_date.setdefault(performed_on, {})
        exercises.setdefault(row["name"], []).append({
            "reps": row["reps"],
            "weight": float(row["weight"]),
            "weight_unit": row["weight_unit"]
        })

    return [
        {
            "date": performed_on,
            "exercises": [{"name": name, "sets": sets} for name, sets in exercises.items()]
        }
        for performed_on, exercises in sorted(by_date.items())
    ]
