import { WorkoutHistoryEntry, WorkoutHistorySet } from '@/types/workoutSession'

export const HISTORY_PAGE_SIZE = 5
export const HISTORY_MAX_ITEMS = 100

export const parseLogDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00`)
  return isNaN(date.getTime()) ? null : date
}

export const dateTile = (value: string) => {
  const date = parseLogDate(value)
  if (!date) return { month: '', day: value, label: value }
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: String(date.getDate()),
    label: date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' })
    })
  }
}

export const formatSet = (set: WorkoutHistorySet): string => {
  const reps = set.reps ?? 0
  if (set.weight === null) return `${reps} ${reps === 1 ? 'rep' : 'reps'}`
  return `${reps} × ${Number(set.weight.toFixed(2))} ${set.weight_unit}`
}

export const countSets = (workout: WorkoutHistoryEntry): number =>
  workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)

export const pluralize = (count: number, word: string) =>
  `${count} ${count === 1 ? word : `${word}s`}`
