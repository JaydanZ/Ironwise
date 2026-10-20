// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
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
  sanitizeWeight,
  sessionReducer,
  SessionState,
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
  unit: 'lb'
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
    state = sessionReducer(state, { type: 'setUnit', unit: 'kg' })

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
