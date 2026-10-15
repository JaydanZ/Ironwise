import { describe, expect, it } from 'vitest'
import { LiftSession, LiftSet, WeightUnit } from '@/types/workoutSession'
import {
  buildExerciseTrend,
  estimateOneRepMax,
  findBestLifts,
  findRecentRecords,
  formatWeight,
  trendExercises
} from './progress'

const set = (
  reps: number | null,
  weight: number | null,
  weight_unit: WeightUnit = 'lb'
): LiftSet => ({ reps, weight, weight_unit })

const session = (
  date: string,
  exercises: Record<string, LiftSet[]>
): LiftSession => ({
  date,
  exercises: Object.entries(exercises).map(([name, sets]) => ({ name, sets }))
})

describe('estimateOneRepMax', () => {
  it('uses the Epley formula and treats a single as its own max', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(150, 5)).toBe(175)
    expect(estimateOneRepMax(300, 10)).toBe(400)
  })
})

describe('findRecentRecords', () => {
  it('flags a session that beats every earlier best set', () => {
    const records = findRecentRecords([
      session('2026-10-01', { 'Bench Press': [set(5, 150), set(5, 155)] }),
      session('2026-10-08', { 'Bench Press': [set(5, 160), set(3, 165)] })
    ])
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      exercise: 'Bench Press',
      date: '2026-10-08',
      set: { reps: 5, weight: 160, unit: 'lb' }
    })
    expect(records[0].set.e1rm).toBeCloseTo(186.67, 1)
    expect(records[0].previousE1rm).toBeCloseTo(180.83, 1)
  })

  it('never counts the first session of an exercise as a record', () => {
    expect(
      findRecentRecords([session('2026-10-01', { Squat: [set(5, 225)] })])
    ).toEqual([])
  })

  it('does not count ties or regressions', () => {
    expect(
      findRecentRecords([
        session('2026-10-01', { Squat: [set(5, 225)] }),
        session('2026-10-03', { Squat: [set(5, 225)] }),
        session('2026-10-05', { Squat: [set(5, 205)] })
      ])
    ).toEqual([])
  })

  it('handles history returned newest first', () => {
    const records = findRecentRecords([
      session('2026-10-08', { Squat: [set(5, 205)] }),
      session('2026-10-01', { Squat: [set(5, 225)] })
    ])
    expect(records).toEqual([])
  })

  it('compares across units without mistaking a conversion for a record', () => {
    // 100 kg is about 220.5 lb
    const sameLoad = findRecentRecords([
      session('2026-10-01', { Deadlift: [set(5, 220.462)] }),
      session('2026-10-08', { Deadlift: [set(5, 100, 'kg')] })
    ])
    expect(sameLoad).toEqual([])

    const heavier = findRecentRecords([
      session('2026-10-01', { Deadlift: [set(5, 220)] }),
      session('2026-10-08', { Deadlift: [set(5, 105, 'kg')] })
    ])
    expect(heavier).toHaveLength(1)
    expect(heavier[0].set.unit).toBe('kg')
    expect(heavier[0].previousE1rm).toBeCloseTo(116.4, 1)
  })

  it('skips bodyweight and zero-rep sets', () => {
    expect(
      findRecentRecords([
        session('2026-10-01', {
          'Pull Up': [set(10, null)],
          Row: [set(0, 135)]
        }),
        session('2026-10-08', {
          'Pull Up': [set(12, null)],
          Row: [set(0, 185)]
        })
      ])
    ).toEqual([])
  })

  it('matches exercise names regardless of case and spacing', () => {
    const records = findRecentRecords([
      session('2026-10-01', { 'bench press ': [set(5, 150)] }),
      session('2026-10-08', { 'Bench Press': [set(5, 160)] })
    ])
    expect(records).toHaveLength(1)
  })

  it('keeps each lift’s latest record, newest first, up to the limit', () => {
    const records = findRecentRecords(
      [
        session('2026-09-01', {
          Squat: [set(5, 200)],
          Bench: [set(5, 150)],
          Row: [set(5, 100)],
          Press: [set(5, 80)]
        }),
        session('2026-09-08', { Squat: [set(5, 210)], Press: [set(5, 85)] }),
        session('2026-09-15', { Squat: [set(5, 220)], Row: [set(5, 110)] }),
        session('2026-09-22', { Bench: [set(5, 155)] })
      ],
      2
    )
    expect(records.map((r) => [r.exercise, r.date])).toEqual([
      ['Bench', '2026-09-22'],
      ['Squat', '2026-09-15']
    ])
  })
})

describe('findBestLifts', () => {
  it('lists each lift’s top set from a single session, heaviest first', () => {
    // The shape of a new account: every lift logged exactly once
    const bests = findBestLifts([
      session('2026-09-26', {
        'Barbell Bench Press': [set(8, 225), set(6, 225)],
        'Dumbbell Lateral Raises': [set(11, 15)]
      }),
      session('2026-09-30', { 'Barbell Back Squat': [set(5, 240)] }),
      session('2026-10-05', { 'Machine Chest Press': [set(8, 200)] })
    ])
    expect(bests.map((b) => [b.exercise, b.date])).toEqual([
      ['Barbell Bench Press', '2026-09-26'],
      ['Barbell Back Squat', '2026-09-30'],
      ['Machine Chest Press', '2026-10-05']
    ])
    expect(bests[0].set).toMatchObject({ reps: 8, weight: 225, unit: 'lb' })
  })

  it('keeps the best session when a lift was logged more than once', () => {
    const [best] = findBestLifts([
      session('2026-10-01', { Squat: [set(5, 250)] }),
      session('2026-10-08', { Squat: [set(5, 230)] })
    ])
    expect(best).toMatchObject({ date: '2026-10-01', set: { weight: 250 } })
  })

  it('ranks across units and skips bodyweight-only lifts', () => {
    const bests = findBestLifts([
      session('2026-10-01', {
        Deadlift: [set(5, 140, 'kg')],
        Squat: [set(5, 300)],
        'Pull Up': [set(10, null)]
      })
    ])
    expect(bests.map((b) => b.exercise)).toEqual(['Deadlift', 'Squat'])
  })

  it('caps the list to the limit', () => {
    expect(
      findBestLifts(
        [
          session('2026-10-01', {
            A: [set(5, 1)],
            B: [set(5, 2)],
            C: [set(5, 3)]
          })
        ],
        2
      ).map((b) => b.exercise)
    ).toEqual(['C', 'B'])
  })
})

describe('trendExercises', () => {
  it('lists weighted lifts with two or more sessions, most trained first', () => {
    const workouts = [
      session('2026-10-01', {
        Squat: [set(5, 200)],
        Bench: [set(5, 150)],
        Curl: [set(10, 30)]
      }),
      session('2026-10-03', { Squat: [set(5, 205)], Bench: [set(5, 155)] }),
      session('2026-10-05', {
        Squat: [set(5, 210)],
        'Pull Up': [set(8, null)]
      }),
      session('2026-10-07', { 'Pull Up': [set(8, null)] })
    ]
    expect(trendExercises(workouts)).toEqual(['Squat', 'Bench'])
  })
})

describe('buildExerciseTrend', () => {
  it('plots each session’s best e1RM, oldest first, in the latest unit', () => {
    const trend = buildExerciseTrend(
      [
        session('2026-10-08', { Squat: [set(5, 100, 'kg')] }),
        session('2026-10-01', { Squat: [set(5, 200), set(3, 210)] })
      ],
      'squat'
    )
    expect(trend?.unit).toBe('kg')
    expect(trend?.points.map((p) => p.date)).toEqual([
      '2026-10-01',
      '2026-10-08'
    ])
    expect(trend?.points[0].set).toMatchObject({
      reps: 5,
      weight: 200,
      unit: 'lb'
    })
    expect(trend?.points[0].value).toBeCloseTo(105.84, 1)
    expect(trend?.points[1].value).toBeCloseTo(116.67, 1)
  })

  it('keeps every session in the year, not just the latest few', () => {
    const workouts = Array.from({ length: 40 }, (_, i) => {
      const date = new Date(2026, 0, 1 + i * 7)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(date.getDate()).padStart(2, '0')}`
      return session(key, { Squat: [set(5, 200 + i)] })
    })
    const trend = buildExerciseTrend(workouts, 'Squat')
    expect(trend?.points).toHaveLength(40)
    expect(trend?.points[0].date).toBe('2026-01-01')
    expect(trend?.points[39].set.weight).toBe(239)
  })

  it('returns null for an exercise with no weighted sets', () => {
    expect(buildExerciseTrend([], 'Squat')).toBeNull()
  })
})

describe('formatWeight', () => {
  it('rounds to one decimal and drops trailing zeros', () => {
    expect(formatWeight(186.666)).toBe('186.7')
    expect(formatWeight(175)).toBe('175')
  })
})
