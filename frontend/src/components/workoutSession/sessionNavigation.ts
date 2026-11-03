import { PreviousExercise, SetEntry, WeightUnit } from '@/types/workoutSession'
import { isExerciseComplete, isSetComplete } from '@/hooks/useWorkoutSession'
import { previousSetFor, toPreviousValues } from './previousSets'

export interface PanelValues {
  weight: string
  reps: string
}

export type StepDirection = 1 | -1

// Matches the limits in backend/models/workouts.py
const MAX_WEIGHT = 2000
const MAX_REPS = 999

const WEIGHT_STEP: Record<WeightUnit, number> = { lb: 5, kg: 2.5 }

export const firstIncompleteExercise = (entries: SetEntry[][]): number => {
  const index = entries.findIndex((sets) => !isExerciseComplete(sets))
  return index === -1 ? 0 : index
}

export const selectedSetIndex = (
  sets: SetEntry[],
  override: number | null
): number => {
  if (override !== null && override < sets.length) return override
  const index = sets.findIndex((entry) => !isSetComplete(entry))
  return index === -1 ? sets.length - 1 : index
}

export const nextExerciseIndex = (
  entries: SetEntry[][],
  current: number
): number | null => {
  for (let offset = 1; offset < entries.length; offset++) {
    const index = (current + offset) % entries.length
    if (!isExerciseComplete(entries[index])) return index
  }
  return null
}

export const exerciseAfterDone = (
  entries: SetEntry[][],
  exercise: number,
  set: number,
  reps: string
): number => {
  if (isExerciseComplete(entries[exercise])) return exercise
  const updated = entries.map((sets, exerciseIndex) =>
    exerciseIndex !== exercise
      ? sets
      : sets.map((entry, setIndex) =>
          setIndex !== set ? entry : { ...entry, reps }
        )
  )
  if (!isExerciseComplete(updated[exercise])) return exercise
  return nextExerciseIndex(updated, exercise) ?? exercise
}

interface SeedValuesArgs {
  sets: SetEntry[]
  setIndex: number
  targetReps: number
  previous?: PreviousExercise
  unit: WeightUnit
}

const inheritedValues = ({
  sets,
  setIndex,
  targetReps,
  previous,
  unit
}: SeedValuesArgs): PanelValues => {
  for (let index = setIndex - 1; index >= 0; index--) {
    if (isSetComplete(sets[index]))
      return { weight: sets[index].weight, reps: sets[index].reps }
  }
  const last = toPreviousValues(previousSetFor(previous, setIndex + 1), unit)
  if (last) return { weight: last.weight ?? '', reps: last.reps }
  return { weight: '', reps: String(targetReps) }
}

export const seedValues = (args: SeedValuesArgs): PanelValues => {
  const own = args.sets[args.setIndex]
  if (isSetComplete(own)) return { weight: own.weight, reps: own.reps }
  const inherited = inheritedValues(args)
  return own.weight ? { ...inherited, weight: own.weight } : inherited
}

const step = (
  value: string,
  amount: number,
  max: number,
  direction: StepDirection
): string => {
  if (value.trim() === '' && direction === -1) return ''
  const current = parseFloat(value)
  const next = (Number.isFinite(current) ? current : 0) + direction * amount
  // Rounding stops float noise reaching the backend, which allows two decimals
  return String(Math.round(Math.min(max, Math.max(0, next)) * 100) / 100)
}

export const stepWeight = (
  value: string,
  direction: StepDirection,
  unit: WeightUnit
): string => step(value, WEIGHT_STEP[unit], MAX_WEIGHT, direction)

export const stepReps = (value: string, direction: StepDirection): string =>
  step(value, 1, MAX_REPS, direction)

export const clampWeight = (value: string): string =>
  parseFloat(value) > MAX_WEIGHT ? String(MAX_WEIGHT) : value
