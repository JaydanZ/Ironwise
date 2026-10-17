import logging
import ast
from datetime import date, timedelta
from uuid import UUID
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request
from pydantic import BaseModel
from ..Database.programs import get_owned_program
from ..Database.users import find_user_by_id, set_users_active_program, update_user_password
from ..Database.redisClient import redis_client
from ..Database.workouts import get_workout_history
from ..middleware.authenticateToken import get_current_user
from ..models.auth import AuthorizedReturn, ChangePassword, Token
from ..utils.createToken import create_access_token, create_refresh_token
from ..utils.email import send_password_changed_email
from ..utils.limiter import limiter, user_key
from ..utils.passwordPolicy import reject_weak_password
from ..utils.passwordReset import revoke_sessions
from ..utils.passwords import verify_password

logger = logging.getLogger(__name__)

class ProgramIdRequest(BaseModel):
    program_id: UUID

## Endpoints scoped to the authenticated user
users_router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@users_router.get("/me", status_code=200)
async def get_current_user_profile(current_user_id: str = Depends(get_current_user)):
    user_data_response = find_user_by_id(current_user_id)
    if not user_data_response:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = ast.literal_eval(str(user_data_response))

    active_program = get_owned_program(user_data.get("active_program"), current_user_id)

    return {
        "user_id": user_data["id"],
        "username": user_data["username"],
        "email": user_data["email"],
        "workout_streak": user_data.get("current_streak") or 0,
        "active_program": [active_program] if active_program else [],
        "workout_history": get_workout_history(current_user_id, date.today() - timedelta(days=365)),
    }

@users_router.put("/me/active-program", status_code=200)
async def set_active_program(payload: ProgramIdRequest, user_id: str = Depends(get_current_user)):
    program = get_owned_program(str(payload.program_id), user_id)
    if program is None:
        raise HTTPException(status_code=404, detail="Program not found")

    update_response_data = set_users_active_program(program["id"], user_id)
    if not isinstance(update_response_data, list) or not update_response_data:
        logger.error("Failed to set active program: %s", update_response_data)
        raise HTTPException(status_code=500, detail="Failed to set active program")

    update_response = ast.literal_eval(str(update_response_data))

    return {
        "message": "active program set",
        "program_id": update_response[0]["active_program"]
    }


@users_router.put("/me/password", status_code=200)
@limiter.limit("5/minute", key_func=user_key)
def change_password(
    request: Request,
    body: ChangePassword,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(get_current_user),
):
    user = find_user_by_id(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(body.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    reject_weak_password(body.new_password, user["email"], user["username"])

    update_user_password(user["id"], body.new_password)

    # Sign out every device, then give this one a fresh session
    revoke_sessions(user["id"])
    refresh_token = create_refresh_token(data={"sub": user["id"]})
    redis_client.set(str(user["id"]), refresh_token)
    token_data = Token(access_token=create_access_token(data={"sub": user["id"]}), generated_by_refresh_token=False)

    background_tasks.add_task(send_password_changed_email, user["email"], user["username"])

    return AuthorizedReturn(
        token_data=token_data, refresh_token_data=refresh_token, username=user["username"], email=user["email"]
    )
