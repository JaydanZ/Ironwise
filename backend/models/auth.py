from typing import Annotated
from pydantic import BaseModel, EmailStr, Field, model_validator

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

NewPassword = Annotated[str, Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)]
ExistingPassword = Annotated[str, Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)]


class _NewPasswordPair(BaseModel):
    model_config = {"extra": "forbid"}

    new_password: NewPassword
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

class PasswordResetRequest(BaseModel):
    model_config = {"extra": "forbid"}

    email: EmailStr

class PasswordResetVerify(BaseModel):
    model_config = {"extra": "forbid"}

    email: EmailStr
    code: Annotated[str, Field(pattern=r"^\d{6}$")]

class PasswordResetConfirm(_NewPasswordPair):
    reset_token: Annotated[str, Field(min_length=1, max_length=100)]

class ChangePassword(_NewPasswordPair):
    old_password: ExistingPassword

class Token(BaseModel):
    access_token: str
    generated_by_refresh_token: bool

class AuthorizedReturn(BaseModel):
    token_data: Token
    refresh_token_data: str
    username: str
    email: EmailStr

class RefreshToken(BaseModel):
    refresh_token: str