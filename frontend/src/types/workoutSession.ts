export type WeightUnit = 'lb' | 'kg'

export interface SetEntry {
  reps: string
  weight: string
  notes: string
}

export interface PreviousSet {
  set_number: number
  reps: number | null
  weight: number | null
  weight_unit: WeightUnit
}

export interface PreviousExercise {
  date: string
  sets: PreviousSet[]
}

export type PreviousPerformance = Record<string, PreviousExercise>

export interface SetLog {
  exercise_name: string
  exercise_order: number
  set_number: number
  reps: number
  weight: number | null
  weight_unit: WeightUnit
  notes: string | null
}

export interface WorkoutSubmission {
  program_id: string
  day: string
  focus: string
  performed_on: string
  is_completed: boolean
  sets: SetLog[]
}

export interface SubmitWorkoutResponse {
  completed_workout_id: string
  workout_streak: number
  sets_logged: number
}

export interface WorkoutHistorySet {
  set_number: number
  reps: number | null
  weight: number | null
  weight_unit: WeightUnit
}

export interface WorkoutHistoryExercise {
  name: string
  sets: WorkoutHistorySet[]
}

export interface WorkoutHistoryEntry {
  id: string
  date: string
  day: string | null
  focus: string | null
  program_name: string | null
  is_completed: boolean
  exercises: WorkoutHistoryExercise[]
}

export interface WorkoutHistoryResponse {
  workouts: WorkoutHistoryEntry[]
  total: number
  has_more: boolean
}

export interface WorkoutHistoryArgs {
  page: number
  limit: number
  q: string
}

export interface LiftSet {
  reps: number | null
  weight: number | null
  weight_unit: WeightUnit
}

export interface LiftSession {
  date: string
  exercises: { name: string; sets: LiftSet[] }[]
}
