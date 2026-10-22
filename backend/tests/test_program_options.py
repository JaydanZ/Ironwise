import pytest
from pydantic import ValidationError

from backend.models.programGeneration import ProgramOptions
from backend.utils.programGenerator import program_prompt, prompt_inputs

BASE_OPTIONS = {
    "fitness_goal": "Gain muscle",
    "years_of_experience": "0 - 1 Years",
    "days_per_week": "3 Days",
    "age": 25,
    "weight": 180,
    "weight_unit": "Lbs",
    "gender": "Male",
    "isLoggedIn": False,
    "freeLimitEnabled": True,
}


def test_jobs_queued_before_the_new_options_still_load():
    options = ProgramOptions(**BASE_OPTIONS)

    assert options.training_style == "Weightlifting"
    assert options.workout_location == "Gym"
    assert options.home_equipment == []


@pytest.mark.parametrize("invalid", [
    {"training_style": "Yoga"},
    {"workout_location": "Park"},
    {"workout_location": "Home", "home_equipment": ["Rowing machine"]},
], ids=["unknown style", "unknown location", "unknown equipment"])
def test_rejects_unknown_choices(invalid):
    with pytest.raises(ValidationError):
        ProgramOptions(**BASE_OPTIONS, **invalid)


def test_gym_programs_ignore_home_equipment():
    options = ProgramOptions(**BASE_OPTIONS, workout_location="Gym", home_equipment=["Dumbbells"])

    assert options.home_equipment == []


def test_prompt_includes_style_location_and_equipment():
    options = ProgramOptions(
        **BASE_OPTIONS,
        training_style="Calisthenics",
        workout_location="Home",
        home_equipment=["Pull-up bar", "Resistance bands"],
    )

    prompt = program_prompt().format(**prompt_inputs(options))

    assert "Calisthenics" in prompt
    assert "Home" in prompt
    assert "Pull-up bar, Resistance bands" in prompt


def test_prompt_lists_full_gym_equipment_for_gym_programs():
    prompt = program_prompt().format(**prompt_inputs(ProgramOptions(**BASE_OPTIONS)))

    assert "full gym" in prompt
