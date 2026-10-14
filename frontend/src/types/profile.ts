import { Workout } from './programCreation'
import { WorkoutProgram } from './programCreation'

export interface Profile {
  user_id: string
  username: string
  email: string
  active_program: WorkoutProgram[] | null
  workout_streak: number
  workout_history: WorkoutTracker[]
}

export interface WorkoutTracker {
  has_worked_out: boolean
  program_link: string | null
  date: string | null
}

export interface Program {
  name: string
  is_active_program: boolean
  program_structure: Workout[]
  last_updated: string
}
