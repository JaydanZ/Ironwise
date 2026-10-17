from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from ..utils.createToken import create_access_token, create_refresh_token
from ..utils.validateToken import validateRefreshToken
from ..Database.users import insert_user, find_user_by_email, find_user_by_id, update_user_password
from ..models.users import CreateUser, LoginUser
from ..models.auth import Token, AuthorizedReturn, RefreshToken, PasswordResetRequest, PasswordResetVerify, PasswordResetConfirm
from ..utils.email import send_reset_code_email, send_password_changed_email
from ..utils.limiter import limiter
from ..utils.loginAttempts import clear_failed_logins, is_locked_out, record_failed_login
from ..utils.passwordPolicy import reject_weak_password
from ..utils.passwords import needs_rehash, verify_password
from ..utils.passwordReset import (
    CODE_TTL_SECONDS, issue_code, check_code, issue_reset_token, peek_reset_token, consume_reset_token, revoke_sessions
)

from ..Database.redisClient import redis_client

##oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

auth_router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

@auth_router.post("/register", status_code=201)
@limiter.limit("5/minute")
def create_user(request: Request, user: CreateUser):
    reject_weak_password(user.password, user.email, user.username)

    ## Check if user already exists
    existing_user = find_user_by_email(user.email)
    if existing_user is not None:
        raise HTTPException(status_code=400, detail="User already exists")

    insert_user(user)
    print("user inserted...")
    
    return {"message": "User successfully created"}


@auth_router.post("/login", status_code=201)
@limiter.limit("10/minute")
def login_user(request: Request, user: LoginUser):
    if is_locked_out(user.email):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    existing_user = find_user_by_email(user.email)
    ## Verify before checking existence so unknown emails also pay for a hash
    password_ok = verify_password(user.password, existing_user["password"] if existing_user is not None else None)
    if existing_user is None or not password_ok:
        record_failed_login(user.email)
        raise HTTPException(status_code=401, detail="Invalid Credentials")

    clear_failed_logins(user.email)

    ## The plaintext is only available at login, so legacy bcrypt hashes are upgraded here
    if needs_rehash(existing_user["password"]):
        update_user_password(existing_user["id"], user.password)
    
    ## Generate token for user
    user_id = existing_user["id"]
    token = create_access_token(data={"sub": user_id})
    refresh_token = create_refresh_token(data={"sub": user_id})

    ## Store refresh token in redis
    redis_client.set(str(user_id), refresh_token)

    token_data = Token(access_token=token, generated_by_refresh_token=False)
    
    return AuthorizedReturn(token_data=token_data, refresh_token_data=refresh_token, username=existing_user["username"], email=existing_user["email"])


@auth_router.post("/logout", status_code=200)
def logout_user(refresh_token: RefreshToken):
    if refresh_token is None:
        raise HTTPException(status_code=401, detail="Invalid or no refresh token was provided")
    
    ## Need to validate refresh token 
    payload = validateRefreshToken(refresh_token.refresh_token)
    user_id = payload["sub"]
    storedRefreshToken = redis_client.get(user_id)

    if refresh_token.refresh_token != storedRefreshToken:
        raise HTTPException(status_code=401, detail="Refresh token does not exist")
    
    ## Now we can delete the refresh token from our redis cache
    redis_client.delete(user_id)

    return { "Message": "User logged out successfully" }


@auth_router.post('/refresh', status_code=201)
def generate_new_access_token(refresh_token: RefreshToken):
    if refresh_token is None:
        raise HTTPException(status_code=401, detail="Invalid or no refresh token was provided")

    ## Need to validate refresh token 
    payload = validateRefreshToken(refresh_token.refresh_token)
    user_id = payload["sub"]
    storedRefreshToken = redis_client.get(user_id)

    if refresh_token.refresh_token != storedRefreshToken:
        raise HTTPException(status_code=401, detail="Refresh token does not exist")
    
    ## Token has been validated, generate new access token
    token = create_access_token(data={"sub": user_id})

    return Token(access_token=token, generated_by_refresh_token=True)

RESET_REQUESTED_MESSAGE = "If an account exists for that email, we've sent a code."

@auth_router.post("/password-reset/request", status_code=200)
@limiter.limit("5/minute")
def request_password_reset(request: Request, body: PasswordResetRequest, background_tasks: BackgroundTasks):
    user = find_user_by_email(body.email)
    if user is not None:
        code = issue_code(user["id"])
        if code is not None:
            background_tasks.add_task(
                send_reset_code_email, user["email"], user["username"], code, CODE_TTL_SECONDS // 60
            )

    return {"message": RESET_REQUESTED_MESSAGE}


@auth_router.post("/password-reset/verify", status_code=200)
def verify_password_reset_code(body: PasswordResetVerify):
    user = find_user_by_email(body.email)
    if user is None or not check_code(user["id"], body.code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    return {"reset_token": issue_reset_token(user["id"])}


@auth_router.post("/password-reset/confirm", status_code=200)
def confirm_password_reset(body: PasswordResetConfirm, background_tasks: BackgroundTasks):
    reset_expired = HTTPException(status_code=400, detail="Reset session expired, request a new code")
    user_id = peek_reset_token(body.reset_token)
    user = find_user_by_id(user_id) if user_id is not None else None
    if user is None:
        raise reset_expired

    ## Checked before consuming the token so a rejected password doesn't end the reset session
    reject_weak_password(body.new_password, user["email"], user["username"])
    if consume_reset_token(body.reset_token) != user["id"]:
        raise reset_expired

    update_user_password(user["id"], body.new_password)
    revoke_sessions(user["id"])
    background_tasks.add_task(send_password_changed_email, user["email"], user["username"])

    return {"message": "Password reset"}
