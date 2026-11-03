import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { Exercise, Workout } from '@/types/programCreation'
import {
  SetEntry,
  SetLog,
  WeightUnit,
  WorkoutSubmission
} from '@/types/workoutSession'

type SetField = keyof SetEntry

export interface SessionState {
  entries: SetEntry[][]
  units: WeightUnit[]
}

export type SessionAction =
  | {
      type: 'updateSet'
      exercise: number
      set: number
      field: SetField
      value: string
    }
  | {
      type: 'fillSet'
      exercise: number
      set: number
      reps: string
      weight: string
    }
  | { type: 'addSet'; exercise: number }
  | { type: 'removeSet'; exercise: number }
  | { type: 'setUnit'; exercise: number; unit: WeightUnit }

const UNIT_KEY = 'ironwise:weight-unit'
const EXERCISE_UNITS_KEY = 'ironwise:exercise-units'
const EMPTY_SET: SetEntry = { reps: '', weight: '', notes: '' }

export const MIN_SETS = 1
export const MAX_SETS = 20

export const localDateString = (date = new Date()): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const createEntries = (exercises: Exercise[]): SetEntry[][] =>
  exercises.map((exercise) =>
    Array.from(
      { length: Math.min(MAX_SETS, Math.max(MIN_SETS, exercise.sets)) },
      () => ({ ...EMPTY_SET })
    )
  )

export const sanitizeReps = (value: string): string =>
  value.replace(/\D/g, '').slice(0, 3)

export const sanitizeWeight = (value: string): string => {
  const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  const decimals = rest.join('').slice(0, 2)
  const trimmedWhole = whole.slice(0, 4)
  return cleaned.includes('.') ? `${trimmedWhole}.${decimals}` : trimmedWhole
}

export const isSetComplete = (entry: SetEntry): boolean =>
  /^\d+$/.test(entry.reps.trim())

export const isExerciseComplete = (sets: SetEntry[]): boolean =>
  sets.length > 0 && sets.every(isSetComplete)

export const sessionReducer = (
  state: SessionState,
  action: SessionAction
): SessionState => {
  switch (action.type) {
    case 'updateSet': {
      const sanitize =
        action.field === 'reps'
          ? sanitizeReps
          : action.field === 'weight'
            ? sanitizeWeight
            : (value: string) => value.slice(0, 280)
      return {
        ...state,
        entries: state.entries.map((sets, exerciseIndex) =>
          exerciseIndex !== action.exercise
            ? sets
            : sets.map((entry, setIndex) =>
                setIndex !== action.set
                  ? entry
                  : { ...entry, [action.field]: sanitize(action.value) }
              )
        )
      }
    }
    case 'fillSet':
      return {
        ...state,
        entries: state.entries.map((sets, exerciseIndex) =>
          exerciseIndex !== action.exercise
            ? sets
            : sets.map((entry, setIndex) =>
                setIndex !== action.set
                  ? entry
                  : {
                      ...entry,
                      reps: sanitizeReps(action.reps),
                      weight: sanitizeWeight(action.weight)
                    }
              )
        )
      }
    case 'addSet':
      return {
        ...state,
        entries: state.entries.map((sets, exerciseIndex) =>
          exerciseIndex !== action.exercise || sets.length >= MAX_SETS
            ? sets
            : [...sets, { ...EMPTY_SET }]
        )
      }
    case 'removeSet':
      return {
        ...state,
        entries: state.entries.map((sets, exerciseIndex) =>
          exerciseIndex !== action.exercise || sets.length <= MIN_SETS
            ? sets
            : sets.slice(0, -1)
        )
      }
    case 'setUnit':
      return {
        ...state,
        units: state.units.map((unit, exerciseIndex) =>
          exerciseIndex === action.exercise ? action.unit : unit
        )
      }
    default:
      return state
  }
}

interface BuildSubmissionArgs {
  programId: string
  workout: Workout
  state: SessionState
  performedOn: string
  isCompleted: boolean
}

export const buildSubmission = ({
  programId,
  workout,
  state,
  performedOn,
  isCompleted
}: BuildSubmissionArgs): WorkoutSubmission => {
  const sets: SetLog[] = []
  workout.exercises.forEach((exercise, exerciseIndex) => {
    state.entries[exerciseIndex]?.forEach((entry, setIndex) => {
      if (!isSetComplete(entry)) return
      const weight = parseFloat(entry.weight)
      const notes = entry.notes.trim()
      sets.push({
        exercise_name: exercise.name,
        exercise_order: exerciseIndex,
        set_number: setIndex + 1,
        reps: parseInt(entry.reps, 10),
        weight: Number.isFinite(weight) ? weight : null,
        weight_unit: state.units[exerciseIndex],
        notes: notes ? notes : null
      })
    })
  })

  return {
    program_id: programId,
    day: workout.day,
    focus: workout.focus,
    performed_on: performedOn,
    is_completed: isCompleted,
    sets
  }
}

const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable (private mode); the session still works
  }
}

const DRAFT_PREFIX = 'ironwise:workout:'
export const DRAFT_MAX_AGE_MS = 18 * 60 * 60 * 1000

interface DraftExercise {
  name: string
  sets: SetEntry[]
  unit?: WeightUnit
}

export interface WorkoutDraft {
  startedAt: number
  performedOn: string
  exercises: DraftExercise[]
}

export const workoutDraftKey = (programId: string, day: string): string =>
  `${DRAFT_PREFIX}${programId}:${day}`

const toSetEntry = (entry: Partial<SetEntry> | null | undefined): SetEntry => ({
  reps: sanitizeReps(String(entry?.reps ?? '')),
  weight: sanitizeWeight(String(entry?.weight ?? '')),
  notes: String(entry?.notes ?? '').slice(0, 280)
})

const isWeightUnit = (value: unknown): value is WeightUnit =>
  value === 'lb' || value === 'kg'

const hasInput = (entries: SetEntry[][]): boolean =>
  entries.some((sets) =>
    sets.some((entry) => entry.reps || entry.weight || entry.notes.trim())
  )

export const parseDraft = (
  raw: string | null,
  now: number
): WorkoutDraft | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<WorkoutDraft> | null
    const startedAt = parsed?.startedAt
    const performedOn = parsed?.performedOn
    if (
      typeof startedAt !== 'number' ||
      Math.abs(now - startedAt) >= DRAFT_MAX_AGE_MS ||
      typeof performedOn !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(performedOn) ||
      !Array.isArray(parsed?.exercises)
    )
      return null
    const exercises = parsed.exercises
      .filter(
        (exercise) =>
          typeof exercise?.name === 'string' &&
          Array.isArray(exercise.sets) &&
          exercise.sets.length >= MIN_SETS &&
          exercise.sets.length <= MAX_SETS
      )
      .map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets.map(toSetEntry),
        unit: isWeightUnit(exercise.unit) ? exercise.unit : undefined
      }))
    return { startedAt, performedOn, exercises }
  } catch {
    return null
  }
}

const exerciseKey = (name: string) => name.trim().toLowerCase()

const matchDraft = (
  exercises: Exercise[],
  draft: DraftExercise[]
): (DraftExercise | undefined)[] => {
  const unclaimed = [...draft]
  return exercises.map((exercise) => {
    const match = unclaimed.findIndex(
      (saved) => exerciseKey(saved.name) === exerciseKey(exercise.name)
    )
    return match === -1 ? undefined : unclaimed.splice(match, 1)[0]
  })
}

export const restoreEntries = (
  exercises: Exercise[],
  draft: DraftExercise[]
): SetEntry[][] =>
  matchDraft(exercises, draft).map(
    (saved, index) => saved?.sets ?? createEntries([exercises[index]])[0]
  )

export const restoreUnits = (
  exercises: Exercise[],
  draft: DraftExercise[],
  startingUnit: (name: string) => WeightUnit
): WeightUnit[] =>
  matchDraft(exercises, draft).map(
    (saved, index) => saved?.unit ?? startingUnit(exercises[index].name)
  )

const readRememberedUnits = (): Map<string, WeightUnit> => {
  try {
    const saved = JSON.parse(readStorage(EXERCISE_UNITS_KEY) ?? '{}')
    return new Map(
      Object.entries(saved).filter((entry): entry is [string, WeightUnit] =>
        isWeightUnit(entry[1])
      )
    )
  } catch {
    return new Map()
  }
}

const rememberUnit = (name: string, unit: WeightUnit) => {
  const units = readRememberedUnits().set(exerciseKey(name), unit)
  writeStorage(EXERCISE_UNITS_KEY, JSON.stringify(Object.fromEntries(units)))
}

export const pruneDrafts = (storage: Storage, now: number) => {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index)
  )
  keys.forEach((key) => {
    if (key?.startsWith(DRAFT_PREFIX) && !parseDraft(storage.getItem(key), now))
      storage.removeItem(key)
  })
}

const loadSession = (key: string, exercises: Exercise[]) => {
  const now = Date.now()
  try {
    pruneDrafts(window.localStorage, now)
  } catch {
    // Pruning is housekeeping; a failure only leaves stale drafts behind
  }
  const draft = parseDraft(readStorage(key), now)
  const remembered = readRememberedUnits()
  const defaultUnit: WeightUnit = readStorage(UNIT_KEY) === 'kg' ? 'kg' : 'lb'
  return {
    startedAt: draft?.startedAt ?? now,
    performedOn: draft?.performedOn ?? localDateString(new Date(now)),
    entries: draft
      ? restoreEntries(exercises, draft.exercises)
      : createEntries(exercises),
    units: restoreUnits(
      exercises,
      draft?.exercises ?? [],
      (name) => remembered.get(exerciseKey(name)) ?? defaultUnit
    )
  }
}

interface UseWorkoutSessionArgs {
  programId: string
  workout: Workout
}

export const useWorkoutSession = ({
  programId,
  workout
}: UseWorkoutSessionArgs) => {
  const draftKey = workoutDraftKey(programId, workout.day)
  const [session] = useState(() => loadSession(draftKey, workout.exercises))
  const { startedAt, performedOn } = session

  const [state, dispatch] = useReducer(
    sessionReducer,
    undefined,
    (): SessionState => ({
      entries: session.entries,
      units: session.units
    })
  )

  useEffect(() => {
    if (!hasInput(state.entries)) {
      writeStorage(draftKey, null)
      return
    }
    const draft: WorkoutDraft = {
      startedAt,
      performedOn,
      exercises: workout.exercises.map((exercise, index) => ({
        name: exercise.name,
        sets: state.entries[index],
        unit: state.units[index]
      }))
    }
    writeStorage(draftKey, JSON.stringify(draft))
  }, [
    draftKey,
    startedAt,
    performedOn,
    workout.exercises,
    state.entries,
    state.units
  ])

  const progress = useMemo(() => {
    const completedExercises = state.entries.filter(isExerciseComplete).length
    const allSets = state.entries.flat()
    return {
      completedExercises,
      totalExercises: state.entries.length,
      completedSets: allSets.filter(isSetComplete).length,
      totalSets: allSets.length,
      allComplete:
        state.entries.length > 0 && completedExercises === state.entries.length
    }
  }, [state.entries])

  const updateSet = useCallback(
    (exercise: number, set: number, field: SetField, value: string) =>
      dispatch({ type: 'updateSet', exercise, set, field, value }),
    []
  )

  const fillSet = useCallback(
    (exercise: number, set: number, reps: string, weight: string) =>
      dispatch({ type: 'fillSet', exercise, set, reps, weight }),
    []
  )

  const addSet = useCallback(
    (exercise: number) => dispatch({ type: 'addSet', exercise }),
    []
  )

  const removeSet = useCallback(
    (exercise: number) => dispatch({ type: 'removeSet', exercise }),
    []
  )

  const setUnit = useCallback(
    (exercise: number, unit: WeightUnit) => {
      dispatch({ type: 'setUnit', exercise, unit })
      rememberUnit(workout.exercises[exercise].name, unit)
    },
    [workout.exercises]
  )

  const getSubmission = useCallback(
    (isCompleted: boolean) =>
      buildSubmission({ programId, workout, state, performedOn, isCompleted }),
    [programId, workout, state, performedOn]
  )

  const clearDraft = useCallback(() => writeStorage(draftKey, null), [draftKey])

  return {
    state,
    performedOn,
    progress,
    updateSet,
    fillSet,
    addSet,
    removeSet,
    setUnit,
    getSubmission,
    clearDraft
  }
}
