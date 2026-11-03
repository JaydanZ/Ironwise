// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { Workout } from '@/types/programCreation'
import {
  buildSubmission,
  createEntries,
  DRAFT_MAX_AGE_MS,
  isExerciseComplete,
  MAX_SETS,
  parseDraft,
  pruneDrafts,
  restoreEntries,
  restoreUnits,
  sanitizeWeight,
  sessionReducer,
  SessionState,
  useWorkoutSession,
  WorkoutDraft,
  workoutDraftKey
} from './useWorkoutSession'

const workout: Workout = {
  day: 'Monday',
  focus: 'Upper body',
  exercises: [
    { name: 'Bench Press', sets: 2, reps: 8 },
    { name: 'Pull Up', sets: 1, reps: 10 }
  ]
}

const initialState = (): SessionState => ({
  entries: createEntries(workout.exercises),
  units: ['lb', 'lb']
})

describe('useWorkoutSession helpers', () => {
  it('sizes entries from each exercise set count', () => {
    const entries = createEntries(workout.exercises)
    expect(entries.map((sets) => sets.length)).toEqual([2, 1])
  })

  it('marks an exercise complete only when every set has reps', () => {
    let state = initialState()
    state = sessionReducer(state, {
      type: 'updateSet',
      exercise: 0,
      set: 0,
      field: 'reps',
      value: '8'
    })
    expect(isExerciseComplete(state.entries[0])).toBe(false)

    state = sessionReducer(state, {
      type: 'updateSet',
      exercise: 0,
      set: 1,
      field: 'reps',
      value: '7'
    })
    expect(isExerciseComplete(state.entries[0])).toBe(true)
  })

  it('strips invalid characters from reps and weight', () => {
    const state = sessionReducer(initialState(), {
      type: 'updateSet',
      exercise: 0,
      set: 0,
      field: 'reps',
      value: '1a2b'
    })
    expect(state.entries[0][0].reps).toBe('12')
    expect(sanitizeWeight('135,555')).toBe('135.55')
    expect(sanitizeWeight('12.5.5')).toBe('12.55')
  })

  it('only submits sets that have reps', () => {
    let state = initialState()
    state = sessionReducer(state, {
      type: 'fillSet',
      exercise: 0,
      set: 0,
      reps: '8',
      weight: '135'
    })
    state = sessionReducer(state, {
      type: 'updateSet',
      exercise: 0,
      set: 0,
      field: 'notes',
      value: '  felt easy  '
    })
    state = sessionReducer(state, { type: 'setUnit', exercise: 0, unit: 'kg' })

    const submission = buildSubmission({
      programId: 'program-1',
      workout,
      state,
      performedOn: '2026-09-26',
      isCompleted: false
    })

    expect(submission.sets).toEqual([
      {
        exercise_name: 'Bench Press',
        exercise_order: 0,
        set_number: 1,
        reps: 8,
        weight: 135,
        weight_unit: 'kg',
        notes: 'felt easy'
      }
    ])
    expect(submission.is_completed).toBe(false)
    expect(submission.day).toBe('Monday')
  })

  it('changes the unit of only the targeted exercise', () => {
    const state = sessionReducer(initialState(), {
      type: 'setUnit',
      exercise: 1,
      unit: 'kg'
    })
    expect(state.units).toEqual(['lb', 'kg'])
  })

  it('submits each exercise in its own unit without changing the numbers', () => {
    let state = sessionReducer(initialState(), {
      type: 'fillSet',
      exercise: 0,
      set: 0,
      reps: '8',
      weight: '225'
    })
    state = sessionReducer(state, {
      type: 'fillSet',
      exercise: 1,
      set: 0,
      reps: '10',
      weight: '20'
    })
    state = sessionReducer(state, { type: 'setUnit', exercise: 1, unit: 'kg' })

    const { sets } = buildSubmission({
      programId: 'p1',
      workout,
      state,
      performedOn: '2026-11-02',
      isCompleted: true
    })

    expect(
      sets.map(({ exercise_name, weight, weight_unit }) => ({
        exercise_name,
        weight,
        weight_unit
      }))
    ).toEqual([
      { exercise_name: 'Bench Press', weight: 225, weight_unit: 'lb' },
      { exercise_name: 'Pull Up', weight: 20, weight_unit: 'kg' }
    ])
  })

  it('adds an empty set to only the targeted exercise', () => {
    const state = sessionReducer(initialState(), { type: 'addSet', exercise: 1 })
    expect(state.entries.map((sets) => sets.length)).toEqual([2, 2])
    expect(state.entries[1][1]).toEqual({ reps: '', weight: '', notes: '' })
  })

  it('caps sets per exercise at the maximum', () => {
    let state = initialState()
    for (let i = 0; i < MAX_SETS + 5; i++)
      state = sessionReducer(state, { type: 'addSet', exercise: 0 })
    expect(state.entries[0]).toHaveLength(MAX_SETS)
  })

  it('removes the last set but never the only one', () => {
    let state = sessionReducer(initialState(), {
      type: 'updateSet',
      exercise: 0,
      set: 0,
      field: 'reps',
      value: '8'
    })
    state = sessionReducer(state, { type: 'removeSet', exercise: 0 })
    expect(state.entries[0]).toHaveLength(1)
    expect(state.entries[0][0].reps).toBe('8')

    state = sessionReducer(state, { type: 'removeSet', exercise: 0 })
    state = sessionReducer(state, { type: 'removeSet', exercise: 1 })
    expect(state.entries.map((sets) => sets.length)).toEqual([1, 1])
  })

  it('treats a removed set as no longer required for completion', () => {
    let state = sessionReducer(initialState(), {
      type: 'updateSet',
      exercise: 0,
      set: 0,
      field: 'reps',
      value: '8'
    })
    expect(isExerciseComplete(state.entries[0])).toBe(false)
    state = sessionReducer(state, { type: 'removeSet', exercise: 0 })
    expect(isExerciseComplete(state.entries[0])).toBe(true)
  })

  it('numbers added sets sequentially in the submission', () => {
    let state = sessionReducer(initialState(), { type: 'addSet', exercise: 1 })
    state = sessionReducer(state, {
      type: 'fillSet',
      exercise: 1,
      set: 1,
      reps: '6',
      weight: ''
    })
    const submission = buildSubmission({
      programId: 'p1',
      workout,
      state,
      performedOn: '2026-09-30',
      isCompleted: false
    })
    expect(submission.sets).toHaveLength(1)
    expect(submission.sets[0]).toMatchObject({
      exercise_name: 'Pull Up',
      set_number: 2,
      reps: 6
    })
  })
})

describe('workout drafts', () => {
  const now = Date.parse('2026-10-21T00:30:00')
  const draft: WorkoutDraft = {
    startedAt: now - 60 * 60 * 1000,
    performedOn: '2026-10-20',
    exercises: [
      {
        name: 'Bench Press',
        sets: [
          { reps: '8', weight: '135', notes: '' },
          { reps: '6', weight: '135', notes: 'grindy' }
        ]
      },
      { name: 'Pull Up', sets: [{ reps: '10', weight: '', notes: '' }] }
    ]
  }

  it('restores a draft that started before midnight', () => {
    expect(parseDraft(JSON.stringify(draft), now)).toEqual(draft)
  })

  it('discards a draft older than the max age', () => {
    const stale = { ...draft, startedAt: now - DRAFT_MAX_AGE_MS }
    expect(parseDraft(JSON.stringify(stale), now)).toBeNull()
  })

  it('discards drafts saved in the old date-keyed format', () => {
    const legacy = JSON.stringify(createEntries(workout.exercises))
    expect(parseDraft(legacy, now)).toBeNull()
  })

  it('sanitizes restored values', () => {
    const dirty = {
      ...draft,
      exercises: [
        { name: 'Bench Press', sets: [{ reps: '8x', weight: '1,5', notes: 3 }] }
      ]
    }
    expect(parseDraft(JSON.stringify(dirty), now)?.exercises[0].sets).toEqual([
      { reps: '8', weight: '1.5', notes: '3' }
    ])
  })

  it('matches saved sets to exercises by name after the program changes', () => {
    const edited = [
      { name: 'Pull Up', sets: 1, reps: 10 },
      { name: 'Dip', sets: 3, reps: 12 },
      { name: 'bench press', sets: 4, reps: 8 }
    ]
    const entries = restoreEntries(edited, draft.exercises)
    expect(entries[0]).toEqual(draft.exercises[1].sets)
    expect(entries[1]).toEqual(createEntries([edited[1]])[0])
    expect(entries[2]).toEqual(draft.exercises[0].sets)
  })

  it('gives repeated exercises their own saved sets in order', () => {
    const repeated = [
      { name: 'Pull Up', sets: 1, reps: 10 },
      { name: 'Pull Up', sets: 1, reps: 10 }
    ]
    const saved = [
      { name: 'Pull Up', sets: [{ reps: '10', weight: '', notes: '' }] },
      { name: 'Pull Up', sets: [{ reps: '7', weight: '', notes: '' }] }
    ]
    const entries = restoreEntries(repeated, saved)
    expect(entries.map((sets) => sets[0].reps)).toEqual(['10', '7'])
  })

  it('keeps a valid saved unit and drops an invalid one', () => {
    const withUnits = {
      ...draft,
      exercises: [
        { ...draft.exercises[0], unit: 'kg' },
        { ...draft.exercises[1], unit: 'stone' }
      ]
    }
    const parsed = parseDraft(JSON.stringify(withUnits), now)
    expect(parsed?.exercises.map((exercise) => exercise.unit)).toEqual([
      'kg',
      undefined
    ])
  })

  it('matches saved units by name and falls back for drafts without one', () => {
    const saved = [
      { ...draft.exercises[0], unit: 'kg' as const },
      draft.exercises[1]
    ]
    const edited = [
      { name: 'Pull Up', sets: 1, reps: 10 },
      { name: 'Dip', sets: 3, reps: 12 },
      { name: 'bench press', sets: 4, reps: 8 }
    ]
    const fallback = (name: string) => (name === 'Dip' ? 'kg' : 'lb')
    expect(restoreUnits(edited, saved, fallback)).toEqual(['lb', 'kg', 'kg'])
  })

  describe('pruneDrafts', () => {
    beforeEach(() => localStorage.clear())

    it('removes expired and legacy drafts and keeps fresh ones', () => {
      const freshKey = workoutDraftKey('p1', 'Monday')
      const staleKey = workoutDraftKey('p1', 'Tuesday')
      const legacyKey = `${workoutDraftKey('p1', 'Monday')}:2026-10-16`
      localStorage.setItem(freshKey, JSON.stringify(draft))
      localStorage.setItem(
        staleKey,
        JSON.stringify({ ...draft, startedAt: now - DRAFT_MAX_AGE_MS - 1 })
      )
      localStorage.setItem(legacyKey, '[[{"reps":"9"}]]')
      localStorage.setItem('ironwise:weight-unit', 'kg')

      pruneDrafts(localStorage, now)

      expect(localStorage.getItem(freshKey)).not.toBeNull()
      expect(localStorage.getItem(staleKey)).toBeNull()
      expect(localStorage.getItem(legacyKey)).toBeNull()
      expect(localStorage.getItem('ironwise:weight-unit')).toBe('kg')
    })
  })
})

describe('useWorkoutSession units', () => {
  const start = () =>
    renderHook(() => useWorkoutSession({ programId: 'p1', workout }))

  beforeEach(() => localStorage.clear())

  it('starts every exercise from the saved preference', () => {
    localStorage.setItem('ironwise:weight-unit', 'kg')
    expect(start().result.current.state.units).toEqual(['kg', 'kg'])
  })

  it('defaults to pounds', () => {
    expect(start().result.current.state.units).toEqual(['lb', 'lb'])
  })

  it('remembers an exercise unit for the next workout without changing the rest', () => {
    const { result, unmount } = start()
    act(() => result.current.setUnit(1, 'kg'))
    unmount()

    expect(start().result.current.state.units).toEqual(['lb', 'kg'])
    expect(localStorage.getItem('ironwise:weight-unit')).toBeNull()
  })

  it('ignores corrupt remembered units', () => {
    localStorage.setItem('ironwise:exercise-units', '{"pull up":"stone"')
    expect(start().result.current.state.units).toEqual(['lb', 'lb'])
    localStorage.setItem('ironwise:exercise-units', '{"pull up":"stone"}')
    expect(start().result.current.state.units).toEqual(['lb', 'lb'])
  })

  it('is not confused by an exercise named like an object key', () => {
    const plan = {
      ...workout,
      exercises: [{ name: 'constructor', sets: 1, reps: 1 }]
    }
    localStorage.setItem('ironwise:exercise-units', '{}')
    const { result } = renderHook(() =>
      useWorkoutSession({ programId: 'p1', workout: plan })
    )
    expect(result.current.state.units).toEqual(['lb'])
  })

  it('restores the units of a refreshed session', () => {
    const { result, unmount } = start()
    act(() => result.current.setUnit(0, 'kg'))
    act(() => result.current.fillSet(0, 0, '8', '100'))
    unmount()
    localStorage.removeItem('ironwise:exercise-units')

    expect(start().result.current.state.units).toEqual(['kg', 'lb'])
  })
})
