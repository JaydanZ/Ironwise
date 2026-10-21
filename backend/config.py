from functools import lru_cache
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    CLIENT_URL: str
    REDIS_HOST: str
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    OPENAI_API_KEY: SecretStr
    RESEND_API_KEY: SecretStr
    EMAIL_FROM: str
    AWS_REGION: str
    PROGRAM_QUEUE_URL: str
    SQS_ENDPOINT_URL: str | None = None
    AWS_ACCESS_KEY_ID: SecretStr | None = None
    AWS_SECRET_ACCESS_KEY: SecretStr | None = None
    model_config = SettingsConfigDict(env_file=".env")

## NON AUTHENTICATED ROUTES GO HERE
API_V1_PREFIX = "/api/v1"

non_auth_routes = ["/docs", "/openapi.json"] + [
    f"{API_V1_PREFIX}{path}"
    for path in [
        "/auth/login", "/auth/logout", "/auth/register", "/auth/refresh",
        "/auth/password-reset/request", "/auth/password-reset/verify", "/auth/password-reset/confirm",
    ]
]

## A token is read when sent but not required; matches the prefix and everything under it
optional_auth_route_prefixes = [f"{API_V1_PREFIX}/programs/generate"]

@lru_cache
def get_settings():
    return Settings()