export interface ProgramOptions {
  fitness_goal: string
  years_of_experience: string
  days_per_week: string
  age: number
  weight: number
  weight_unit: string
  gender: string
  isLoggedIn: boolean
}

export interface ProgramSubmission extends ProgramOptions {
  freeLimitEnabled: boolean
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  exercise_tip?: string
}

export interface Workout {
  day: string
  focus: string
  exercises: Exercise[]
}

export interface ProgramStruct {
  program_name: string
  program_structure: Workout[] | null
}

export interface ProgranGenResult {
  name: string
  program_structure: Workout[] | null
  program_tips_and_goals: string[] | null
}

export interface ProgramJob {
  status: 'pending' | 'done' | 'failed'
  program?: ProgranGenResult
}

export interface LatestProgramJob extends ProgramJob {
  job_id: string
}

export interface WorkoutProgram {
  created_at: string
  description: string | null
  id: string
  program_name: string
  program_structure: Workout[]
  updated_at: string
  user_id: string
}

export interface ProgramSummary {
  id: string
  program_name: string
  day_count: number
  is_active: boolean
  updated_at: string | null
}

export interface ProgramPage {
  items: ProgramSummary[]
  total: number
  page: number
  limit: number
}

export interface ProgramPageArgs {
  page: number
  limit: number
  q: string
}

export interface ProgramActiveResponse {
  message: string
  program_id: string
}
