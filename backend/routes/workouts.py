from datetime import date, datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from ..models.workouts import WorkoutSubmission
from ..Database.programs import get_program_by_id
from ..Database.users import find_user_by_id, update_user_streak
from ..Database.workouts import (
    log_workout,
    has_workout_on,
    get_last_workout_date,
    get_previous_performance,
    get_recent_workouts,
    get_lift_history
)
from ..middleware.authenticateToken import get_current_user
from ..utils.programs import program_search_terms
from ..utils.streak import compute_streak, scheduled_weekdays
import ast
import logging

logger = logging.getLogger(__name__)

HISTORY_MAX_LIMIT = 100
HISTORY_MAX_OFFSET = 10_000
HISTORY_SEARCH_MAX_LENGTH = 100
HISTORY_SEARCH_MAX_TERMS = 8
LIFT_HISTORY_DAYS = 365

workouts_router = APIRouter(
    prefix="/workouts",
    tags=["workouts"]
)

def _check_client_date(value: date):
    server_today = datetime.now(timezone.utc).date()
    if abs((value - server_today).days) > 1:
        raise HTTPException(status_code=422, detail="Workout date must be today")

@workouts_router.post("", status_code=201)
async def submit_workout(submission: WorkoutSubmission, user_id: str = Depends(get_current_user)):
    _check_client_date(submission.performed_on)

    program_response = get_program_by_id(submission.program_id)
    if not program_response["success"] or program_response["data"]["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Program not found")
    program = program_response["data"]

    today = submission.performed_on
    already_logged_today = has_workout_on(user_id, today)
    last_date = get_last_workout_date(user_id, today)

    result = log_workout(user_id, submission)
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Failed to save workout")

    user = ast.literal_eval(str(find_user_by_id(user_id))) or {}
    current_streak = user.get("current_streak", 0) or 0

    if already_logged_today:
        streak = max(current_streak, 1)
    else:
        streak = compute_streak(
            current_streak,
            last_date,
            today,
            scheduled_weekdays(program.get("program_structure") or [])
        )

    if streak != current_streak:
        update_user_streak(user_id, streak)

    return {
        "completed_workout_id": result["data"],
        "workout_streak": streak,
        "sets_logged": len(submission.sets)
    }

@workouts_router.get("/previous-performance", status_code=200)
async def previous_performance(
    names: Annotated[list[str], Query(min_length=1, max_length=50)],
    until: date,
    user_id: str = Depends(get_current_user)
):
    _check_client_date(until)

    result = get_previous_performance(user_id, names, until)
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Failed to load previous performance")
    return result["data"]

@workouts_router.get("", status_code=200)
async def workout_history(
    limit: Annotated[int, Query(ge=1, le=HISTORY_MAX_LIMIT)] = 10,
    offset: Annotated[int, Query(ge=0, le=HISTORY_MAX_OFFSET)] = 0,
    q: Annotated[str, Query(max_length=HISTORY_SEARCH_MAX_LENGTH)] = "",
    user_id: str = Depends(get_current_user)
):
    terms = program_search_terms(q, HISTORY_SEARCH_MAX_TERMS)
    result = get_recent_workouts(user_id, limit, offset, terms)
    if not result["success"]:
        logger.error("Failed to load workout history: %s", result.get("error"))
        raise HTTPException(status_code=500, detail="Failed to load workout history")
    return result["data"]

@workouts_router.get("/lift-history", status_code=200)
async def lift_history(user_id: str = Depends(get_current_user)):
    since = datetime.now(timezone.utc).date() - timedelta(days=LIFT_HISTORY_DAYS)
    result = get_lift_history(user_id, since)
    if not result["success"]:
        logger.error("Failed to load lift history: %s", result.get("error"))
        raise HTTPException(status_code=500, detail="Failed to load lift history")
    return result["data"]
