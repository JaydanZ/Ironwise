## Limits for saved and AI generated programs. 
from typing import Literal, get_args

Weekday = Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAYS: tuple[str, ...] = get_args(Weekday)

MAX_DAYS = len(WEEKDAYS)
MAX_EXERCISES_PER_DAY = 20

MIN_SETS_OR_REPS = 1
MAX_SETS_OR_REPS = 99

MAX_PROGRAM_NAME_LENGTH = 60
MAX_FOCUS_LENGTH = 50
MAX_EXERCISE_NAME_LENGTH = 30
MAX_EXERCISE_TIP_LENGTH = 500

PROGRAM_SAVE_RATE_LIMIT = "1 per 5 seconds"

PROGRAMS_PAGE_DEFAULT_LIMIT = 5
PROGRAMS_PAGE_MAX_LIMIT = 50
PROGRAMS_PAGE_MAX = 1_000
PROGRAM_SEARCH_MAX_LENGTH = MAX_PROGRAM_NAME_LENGTH
PROGRAM_SEARCH_MAX_TERMS = 8
