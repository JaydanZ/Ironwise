from typing import Any, Dict, List


def workout_search_text(row: Dict[str, Any]) -> str:
    program = row.get("workout_programs") or {}
    fields = [row.get("focus"), row.get("day"), program.get("program_name")]
    fields += [s.get("name") for s in row.get("exercise_set_logs") or []]
    return " ".join(field for field in fields if field).lower()


def workout_matches(row: Dict[str, Any], terms: List[str]) -> bool:
    """Every term must appear in the workout's title, day, program or one of its exercises."""
    text = workout_search_text(row)
    return all(term in text for term in terms)
