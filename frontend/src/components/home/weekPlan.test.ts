import { describe, expect, it } from 'vitest'
import { Workout } from '@/types/programCreation'
import { WorkoutTracker } from '@/types/profile'
import { buildWeek, startOfWeek } from './weekPlan'

const workout = (day: string, focus = 'Push'): Workout => ({
  day,
  focus,
  exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }]
})

const logged = (date: string): WorkoutTracker => ({
  date,
  has_worked_out: true,
  program_link: null
})

// Thursday, 15 Oct 2026
const THURSDAY = new Date(2026, 9, 15, 18, 30)

describe('week plan', () => {
  it('starts the week on Monday, including when today is Sunday', () => {
    expect(startOfWeek(THURSDAY).getDate()).toBe(12)
    expect(startOfWeek(new Date(2026, 9, 18)).getDate()).toBe(12)
    expect(startOfWeek(new Date(2026, 9, 12)).getDate()).toBe(12)
  })

  it('lays out seven days from Monday to Sunday', () => {
    const { days } = buildWeek(THURSDAY, [], [])
    expect(days.map((day) => day.shortName)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun'
    ])
    expect(days[0].date).toBe('2026-10-12')
    expect(days[6].date).toBe('2026-10-18')
    expect(days.filter((day) => day.isToday).map((day) => day.date)).toEqual([
      '2026-10-15'
    ])
  })

  it('marks done, missed, today, planned and rest days', () => {
    const structure = [
      workout('Monday'),
      workout('Tuesday'),
      workout('Thursday'),
      workout('Saturday', 'Legs')
    ]
    const { days, scheduledCount, completedCount } = buildWeek(
      THURSDAY,
      structure,
      [logged('2026-10-12')]
    )

    expect(days.map((day) => day.status)).toEqual([
      'done',
      'missed',
      'rest',
      'today',
      'rest',
      'planned',
      'rest'
    ])
    expect(days[5].workout?.focus).toBe('Legs')
    expect(scheduledCount).toBe(4)
    expect(completedCount).toBe(1)
  })

  it('counts a workout on an unscheduled day as done', () => {
    const { days, completedCount } = buildWeek(
      THURSDAY,
      [workout('Monday')],
      [logged('2026-10-14')]
    )
    expect(days[2].status).toBe('done')
    expect(completedCount).toBe(1)
  })

  it('ignores history outside the current week and unparseable days', () => {
    const { days, scheduledCount } = buildWeek(
      THURSDAY,
      [workout(''), workout('Funday')],
      [logged('2026-10-11'), logged('2026-10-19')]
    )
    expect(days.every((day) => day.status === 'rest')).toBe(true)
    expect(scheduledCount).toBe(0)
  })
})
