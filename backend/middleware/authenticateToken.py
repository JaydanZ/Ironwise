import jwt
from fastapi import Request, status, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response, JSONResponse
from ..config import non_auth_routes, optional_auth_route_prefixes
from ..config import get_settings

## Setup env vars
envVars = get_settings()
JWT_SECRET_KEY = envVars.JWT_SECRET_KEY
ALGORITHM = 'HS256'

def handleTokenError(detail: str):
    return JSONResponse(
                content={"detail": detail},
                status_code=status.HTTP_401_UNAUTHORIZED
            )

def is_optional_auth_route(path: str) -> bool:
    return any(path == prefix or path.startswith(f"{prefix}/") for prefix in optional_auth_route_prefixes)

class TokenAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:

        ## Check if route requires token
        if request.url.path in non_auth_routes:
            return await call_next(request)
        
        if request.method == "OPTIONS":
            return await call_next(request)

        ## Check if user has token or is valid
        access_token = request.headers.get("authorization")

        if not access_token or not access_token.startswith("Bearer "):
            if is_optional_auth_route(request.url.path):
                return await call_next(request)
            return handleTokenError("Authentication Required")
    
        token = access_token.split(" ")[1]

        ## Validate the access token / check if it has expired
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=ALGORITHM)
            request.state.user_token = payload
            # Extract user_id from token payload and make it available for route handlers
            request.state.current_user_id = payload.get("sub")  # 'sub' typically contains the user ID
        except jwt.ExpiredSignatureError:
            return handleTokenError("Token Expired")
        except jwt.InvalidTokenError:
            return handleTokenError("Invalid Token")

        response = await call_next(request)
        return response


def get_current_user(request: Request):
    if hasattr(request.state, 'current_user_id'):
        return request.state.current_user_id
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated"
    )
