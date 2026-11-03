import { describe, expect, it } from 'vitest'
import { Workout } from '@/types/programCreation'
import { SetLog, WorkoutSubmission } from '@/types/workoutSession'
import { formatSet, summarizeSession } from './sessionSummary'

const workout: Workout = {
  day: 'Monday',
  focus: 'Upper body',
  exercises: [
    { name: 'Bench Press', sets: 3, reps: 8 },
    { name: 'Pull-up', sets: 2, reps: 10 },
    { name: 'Face Pull', sets: 3, reps: 15 }
  ]
}

const set = (
  exercise_order: number,
  set_number: number,
  reps: number,
  weight: number | null
): SetLog => ({
  exercise_name: workout.exercises[exercise_order].name,
  exercise_order,
  set_number,
  reps,
  weight,
  weight_unit: 'lb',
  notes: null
})

const submission: WorkoutSubmission = {
  program_id: 'program-1',
  day: 'Monday',
  focus: 'Upper body',
  performed_on: '2026-09-29',
  is_completed: false,
  sets: [
    set(0, 1, 8, 135),
    set(0, 2, 6, 155),
    set(0, 3, 8, 155),
    set(1, 1, 10, null),
    set(1, 2, 8, null)
  ]
}

describe('summarizeSession', () => {
  const summary = summarizeSession(workout, submission)

  it('groups logged sets by exercise and keeps skipped exercises', () => {
    expect(summary.exercises.map((e) => e.sets.length)).toEqual([3, 2, 0])
    expect(summary.exercises[2].best).toBeNull()
  })

  it('picks the heaviest set, breaking ties on reps', () => {
    expect(summary.exercises[0].best?.set_number).toBe(3)
    expect(summary.exercises[1].best?.set_number).toBe(1)
  })

  it('totals reps', () => {
    expect(summary.totalReps).toBe(40)
    expect(summary.isCompleted).toBe(false)
  })
})

describe('formatSet', () => {
  it('formats weighted and bodyweight sets', () => {
    expect(formatSet(set(0, 1, 8, 135))).toBe('135 × 8')
    expect(formatSet(set(0, 1, 8, 1052.5), true)).toBe('1,052.5 lb × 8')
    expect(formatSet(set(1, 1, 10, null))).toBe('10 reps')
  })
})
