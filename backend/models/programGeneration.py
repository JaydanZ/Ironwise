from typing import Annotated, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from .programs import ProgramName, Focus, ExerciseName, ExerciseTip, SetsOrReps, check_unique_days
from .programRules import Weekday, MAX_DAYS, MAX_EXERCISES_PER_DAY

TrainingStyle = Literal["Weightlifting", "Calisthenics", "Hybrid"]
WorkoutLocation = Literal["Gym", "Home"]
HomeEquipment = Literal[
    "None",
    "Pull-up bar",
    "Dip bars / rings",
    "Dumbbells",
    "Kettlebells",
    "Resistance bands",
    "Bench",
    "Barbell and rack",
]

class ProgramOptions(BaseModel):
    fitness_goal:str
    ## Defaults keep jobs queued before these options existed loadable by the worker
    training_style:TrainingStyle = "Weightlifting"
    workout_location:WorkoutLocation = "Gym"
    home_equipment:list[HomeEquipment] = []
    years_of_experience:str
    days_per_week:str
    age:int
    weight:int
    weight_unit:str
    gender:str
    isLoggedIn:bool
    freeLimitEnabled:bool

    @model_validator(mode="after")
    def gym_has_full_equipment(self):
        if self.workout_location == "Gym":
            self.home_equipment = []
        return self

## Uses the same field limits as saved programs so a generated program can always be saved
class Exercise(BaseModel):
    name: ExerciseName = Field(description="Name of the exercise")
    sets: SetsOrReps = Field(description="Number of sets to perform for the exercise")
    reps: SetsOrReps = Field(description="Number of reps to perform per set for the exercise")
    exercise_tip: ExerciseTip = Field(description="Tip / Goal for the exercise to increase the users performance and ensure users safety when performing the exercise")
class Workout(BaseModel):
    day: Weekday = Field(description="Name of the day the user will perform the workout (i.e. Monday, Tuesday, etc.)")
    focus: Focus = Field(description="Focus of the workout (i.e. Push day, Upper Day, etc.)")
    exercises: Annotated[list[Exercise], Field(min_length=1, max_length=MAX_EXERCISES_PER_DAY)] = Field(description="A collection of exercises the user will perform for the day")
class ProgramResult(BaseModel):
    name: ProgramName = Field(description="A short descriptive name for the program (i.e. '5-Day Upper/Lower Split')")
    program_structure: Annotated[list[Workout], Field(min_length=1, max_length=MAX_DAYS)] = Field(description="A collection of workouts the user will perform for the week, at most one per weekday")
    program_tips_and_goals: list[str] = Field(description="A collection of workout tips / goals to help the user along their journey (Max 4 entries)")

    @field_validator("program_structure")
    @classmethod
    def unique_days(cls, workouts):
        return check_unique_days(workouts)
