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
  unit: WeightUnit
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
  | { type: 'setUnit'; unit: WeightUnit }

const UNIT_KEY = 'ironwise:weight-unit'
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
      return { ...state, unit: action.unit }
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
        weight_unit: state.unit,
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
        sets: exercise.sets.map(toSetEntry)
      }))
    return { startedAt, performedOn, exercises }
  } catch {
    return null
  }
}

const sameExercise = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

export const restoreEntries = (
  exercises: Exercise[],
  draft: DraftExercise[]
): SetEntry[][] => {
  const unclaimed = [...draft]
  return exercises.map((exercise) => {
    const match = unclaimed.findIndex((saved) =>
      sameExercise(saved.name, exercise.name)
    )
    if (match === -1) return createEntries([exercise])[0]
    return unclaimed.splice(match, 1)[0].sets
  })
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
  return {
    startedAt: draft?.startedAt ?? now,
    performedOn: draft?.performedOn ?? localDateString(new Date(now)),
    entries: draft
      ? restoreEntries(exercises, draft.exercises)
      : createEntries(exercises)
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
      unit: readStorage(UNIT_KEY) === 'kg' ? 'kg' : 'lb'
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
        sets: state.entries[index]
      }))
    }
    writeStorage(draftKey, JSON.stringify(draft))
  }, [draftKey, startedAt, performedOn, workout.exercises, state.entries])

  useEffect(() => {
    writeStorage(UNIT_KEY, state.unit)
  }, [state.unit])

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
    (unit: WeightUnit) => dispatch({ type: 'setUnit', unit }),
    []
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
