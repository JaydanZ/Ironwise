import { describe, expect, it } from 'vitest'
import { PreviousExercise, SetEntry } from '@/types/workoutSession'
import {
  clampWeight,
  exerciseAfterDone,
  firstIncompleteExercise,
  nextExerciseIndex,
  seedValues,
  selectedSetIndex,
  stepReps,
  stepWeight
} from './sessionNavigation'

const logged = (reps = '8', weight = '100'): SetEntry => ({
  reps,
  weight,
  notes: ''
})
const empty = (): SetEntry => ({ reps: '', weight: '', notes: '' })

describe('firstIncompleteExercise', () => {
  it('finds the first exercise with an unlogged set', () => {
    expect(firstIncompleteExercise([[logged()], [empty()], [empty()]])).toBe(1)
  })

  it('falls back to the first exercise when all are complete', () => {
    expect(firstIncompleteExercise([[logged()], [logged()]])).toBe(0)
  })
})

describe('selectedSetIndex', () => {
  it('defaults to the first incomplete set', () => {
    expect(selectedSetIndex([logged(), empty(), empty()], null)).toBe(1)
  })

  it('defaults to the last set when the exercise is complete', () => {
    expect(selectedSetIndex([logged(), logged()], null)).toBe(1)
  })

  it('uses a valid override', () => {
    expect(selectedSetIndex([logged(), empty()], 0)).toBe(0)
  })

  it('ignores an override for a set that was removed', () => {
    expect(selectedSetIndex([logged(), empty()], 4)).toBe(1)
  })
})

describe('nextExerciseIndex', () => {
  it('returns the next incomplete exercise', () => {
    expect(nextExerciseIndex([[empty()], [logged()], [empty()]], 0)).toBe(2)
  })

  it('wraps around to skipped exercises', () => {
    expect(nextExerciseIndex([[empty()], [logged()], [empty()]], 2)).toBe(0)
  })

  it('returns null when no other exercise is incomplete', () => {
    expect(nextExerciseIndex([[empty()], [logged()]], 0)).toBeNull()
  })
})

describe('exerciseAfterDone', () => {
  it('stays when sets remain', () => {
    expect(exerciseAfterDone([[empty(), empty()], [empty()]], 0, 0, '8')).toBe(0)
  })

  it('advances when the press completes the exercise', () => {
    expect(exerciseAfterDone([[logged(), empty()], [empty()]], 0, 1, '8')).toBe(1)
  })

  it('stays when the press completes the whole workout', () => {
    expect(exerciseAfterDone([[logged()], [empty()]], 1, 0, '8')).toBe(1)
  })

  it('stays when editing an already complete exercise', () => {
    expect(exerciseAfterDone([[logged()], [empty()]], 0, 0, '10')).toBe(0)
  })
})

describe('seedValues', () => {
  const previous: PreviousExercise = {
    date: '2026-10-30',
    sets: [{ set_number: 1, reps: 6, weight: 100, weight_unit: 'kg' }]
  }
  const base = { targetReps: 10, unit: 'kg' as const }

  it('prefers the set’s logged values', () => {
    const sets = [logged('5', '90')]
    expect(seedValues({ ...base, sets, setIndex: 0, previous })).toEqual({
      weight: '90',
      reps: '5'
    })
  })

  it('then the nearest earlier logged set this session', () => {
    const sets = [logged('7', '80'), empty(), empty()]
    expect(seedValues({ ...base, sets, setIndex: 2, previous })).toEqual({
      weight: '80',
      reps: '7'
    })
  })

  it('then last session, converted to the current unit', () => {
    expect(
      seedValues({ ...base, unit: 'lb', sets: [empty()], setIndex: 0, previous })
    ).toEqual({ weight: '220.5', reps: '6' })
  })

  it('then target reps with a blank weight', () => {
    expect(seedValues({ ...base, sets: [empty()], setIndex: 0 })).toEqual({
      weight: '',
      reps: '10'
    })
  })

  it('keeps a weight typed on an unlogged set', () => {
    const sets = [{ reps: '', weight: '75', notes: '' }]
    expect(seedValues({ ...base, sets, setIndex: 0, previous })).toEqual({
      weight: '75',
      reps: '6'
    })
  })
})

describe('stepWeight', () => {
  it('steps by 5 lb and 2.5 kg', () => {
    expect(stepWeight('100', 1, 'lb')).toBe('105')
    expect(stepWeight('100', -1, 'kg')).toBe('97.5')
  })

  it('keeps a blank weight blank when decreasing', () => {
    expect(stepWeight('', -1, 'lb')).toBe('')
  })

  it('goes one step up from blank', () => {
    expect(stepWeight('', 1, 'kg')).toBe('2.5')
  })

  it('stays within 0 and 2000', () => {
    expect(stepWeight('2', -1, 'lb')).toBe('0')
    expect(stepWeight('1999', 1, 'lb')).toBe('2000')
  })

  it('never produces more than two decimals', () => {
    expect(stepWeight('135.35', 1, 'lb')).toBe('140.35')
    expect(stepWeight('0.07', 1, 'kg')).toBe('2.57')
  })
})

describe('stepReps', () => {
  it('steps by one within 0 and 999', () => {
    expect(stepReps('8', 1)).toBe('9')
    expect(stepReps('0', -1)).toBe('0')
    expect(stepReps('999', 1)).toBe('999')
  })

  it('handles blank', () => {
    expect(stepReps('', 1)).toBe('1')
    expect(stepReps('', -1)).toBe('')
  })
})

describe('clampWeight', () => {
  it('caps typed values at 2000 and leaves others alone', () => {
    expect(clampWeight('9999')).toBe('2000')
    expect(clampWeight('135.5')).toBe('135.5')
    expect(clampWeight('')).toBe('')
  })
})
