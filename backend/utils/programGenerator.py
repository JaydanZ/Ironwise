import logging
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.exceptions import OutputParserException

from ..config import get_settings
from ..models.programGeneration import ProgramOptions, ProgramResult
from ..models.programRules import (
    WEEKDAYS,
    MAX_EXERCISES_PER_DAY,
    MAX_PROGRAM_NAME_LENGTH,
    MAX_FOCUS_LENGTH,
    MAX_EXERCISE_NAME_LENGTH,
)

logger = logging.getLogger(__name__)

## Get OPEN API key
envVars = get_settings()
openai_api_key = envVars.OPENAI_API_KEY

## Chat model definition
OPENAI_MODEL = "gpt-5-nano"

## One retry when the model's output breaks the program rules
MAX_GENERATION_ATTEMPTS = 2

llm = ChatOpenAI(api_key=openai_api_key, model=OPENAI_MODEL)
parser = PydanticOutputParser(pydantic_object=ProgramResult)

class ProgramGenerationError(Exception):
    pass

## Prompt Template
PROGRAM_GENERATION_PROMPT_TEMPLATE = f"""
    You're a fitness trainer with over 10 years of experience with weightlifting, calisthenics, bodybuilding, strength training and
    assiting other people to achieve their fitness goals. Your objective is to generate a workout program for the user
    following these arguments provided by the user:
    Only schedule workouts on weekdays (If days_per_week is less than 6),
    Ensure the user has enough recovery time during the week
    Schedule each day at most once, using only these day names: {", ".join(WEEKDAYS)}
    Keep the program name under {MAX_PROGRAM_NAME_LENGTH} characters, each focus under {MAX_FOCUS_LENGTH} characters,
    each exercise name under {MAX_EXERCISE_NAME_LENGTH} characters, and at most {MAX_EXERCISES_PER_DAY} exercises per day
    Only use exercises the user's available equipment allows
    For calisthenics, build the program around bodyweight movements and their progressions; for hybrid, mix bodyweight and weighted exercises
    User's fitness goal: {{fitness_goal}}
    User's training style: {{training_style}}
    User's workout location: {{workout_location}}
    User's available equipment: {{equipment}}
    User's years of experience working out: {{years_of_experience}}
    User's availability to workout during the week: {{days_per_week}}
    User's current age: {{age}}
    User's current weight: {{weight}} {{weight_unit}}
    User's gender: {{gender}}
    {{format_instructions}}
"""

def invoke_with_retry(chain, inputs: dict):
    for attempt in range(1, MAX_GENERATION_ATTEMPTS + 1):
        try:
            return chain.invoke(inputs)
        # Only invalid output is retried; API and network errors would fail again
        except OutputParserException as error:
            logger.warning("Generated program failed validation (attempt %d): %s", attempt, error)
            last_error = error
    raise ProgramGenerationError("Generated program failed validation") from last_error

def program_prompt():
    return PromptTemplate(
        template=PROGRAM_GENERATION_PROMPT_TEMPLATE,
        input_variables=["fitness_goal","training_style","workout_location","equipment","years_of_experience",
                         "days_per_week","age","weight","weight_unit","gender"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

def prompt_inputs(program: ProgramOptions):
    equipment = (", ".join(program.home_equipment) or "None (bodyweight only)") if program.workout_location == "Home" else "A full gym"
    return {"fitness_goal":program.fitness_goal, "training_style": program.training_style,
            "workout_location": program.workout_location, "equipment": equipment,
            "years_of_experience": program.years_of_experience, "days_per_week": program.days_per_week,
            "age":program.age, "weight":program.weight, "weight_unit":program.weight_unit, "gender": program.gender}

def generate_program(program: ProgramOptions):
    chain = program_prompt() | llm | parser

    return invoke_with_retry(chain, prompt_inputs(program))
