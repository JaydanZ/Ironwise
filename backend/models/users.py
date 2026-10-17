from typing import Annotated
from pydantic import BaseModel, EmailStr, Field
from .auth import ExistingPassword, NewPassword

MIN_USERNAME_LENGTH = 4

class CreateUser(BaseModel):
    model_config = {"extra": "forbid"}

    username: Annotated[str, Field(min_length=MIN_USERNAME_LENGTH)]
    email: EmailStr
    password: NewPassword

class LoginUser(BaseModel):
    model_config = {"extra": "forbid"}

    email: EmailStr
    password: ExistingPassword