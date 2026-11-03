import { Workout } from '@/types/programCreation'
import { SetLog, WorkoutSubmission } from '@/types/workoutSession'

export interface ExerciseSummary {
  name: string
  sets: SetLog[]
  best: SetLog | null
}

export interface SessionSummary {
  exercises: ExerciseSummary[]
  totalReps: number
  isCompleted: boolean
}

const isBetterSet = (candidate: SetLog, current: SetLog): boolean => {
  const candidateWeight = candidate.weight ?? 0
  const currentWeight = current.weight ?? 0
  if (candidateWeight !== currentWeight) return candidateWeight > currentWeight
  return candidate.reps > current.reps
}

export const summarizeSession = (
  workout: Workout,
  submission: WorkoutSubmission
): SessionSummary => {
  const exercises = workout.exercises.map((exercise, index) => {
    const sets = submission.sets.filter((set) => set.exercise_order === index)
    const best = sets.reduce<SetLog | null>(
      (top, set) => (!top || isBetterSet(set, top) ? set : top),
      null
    )
    return { name: exercise.name, sets, best }
  })

  return {
    exercises,
    totalReps: submission.sets.reduce((sum, set) => sum + set.reps, 0),
    isCompleted: submission.is_completed
  }
}

const numberFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1
})

export const formatNumber = (value: number): string =>
  numberFormat.format(value)

export const formatSet = (set: SetLog, withUnit = false): string =>
  set.weight === null || set.weight === 0
    ? `${set.reps} reps`
    : `${formatNumber(set.weight)}${withUnit ? ` ${set.weight_unit}` : ''} × ${set.reps}`
