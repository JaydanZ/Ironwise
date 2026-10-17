import hashlib
import logging

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/"
HIBP_TIMEOUT_SECONDS = 3.0

BREACHED_PASSWORD_MESSAGE = "This password has appeared in a data breach. Choose a different one."
PERSONAL_PASSWORD_MESSAGE = "Password can't be your username or email"


## k-anonymity: only the first 5 hex chars of the SHA-1 leave the server
def is_password_breached(password: str) -> bool:
    digest = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = digest[:5], digest[5:]

    try:
        response = httpx.get(
            f"{HIBP_RANGE_URL}{prefix}",
            headers={"Add-Padding": "true", "User-Agent": "Ironwise"},
            timeout=HIBP_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        ## Fail open: an HIBP outage shouldn't block sign-ups or password changes
        logger.warning("HIBP check skipped: %s", error)
        return False

    for line in response.text.splitlines():
        candidate, _, count = line.partition(":")
        ## Padding rows have a count of 0
        if candidate == suffix and count.strip() != "0":
            return True
    return False


def _is_personal(password: str, email: str, username: str) -> bool:
    lowered = password.casefold()
    email = email.casefold()
    return lowered in {username.casefold(), email, email.split("@")[0]}


def reject_weak_password(password: str, email: str, username: str) -> None:
    if _is_personal(password, email, username):
        raise HTTPException(status_code=400, detail=PERSONAL_PASSWORD_MESSAGE)
    if is_password_breached(password):
        raise HTTPException(status_code=400, detail=BREACHED_PASSWORD_MESSAGE)
