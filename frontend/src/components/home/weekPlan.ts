import { Workout } from '@/types/programCreation'
import { WorkoutTracker } from '@/types/profile'
import { localDateString } from '@/hooks/useWorkoutSession'
import { DAY_NAMES, getDayIndex } from '../profile/schedule'

export type WeekDayStatus = 'done' | 'missed' | 'today' | 'planned' | 'rest'

export interface WeekDay {
  date: string
  dayIndex: number
  shortName: string
  dayOfMonth: number
  isToday: boolean
  workout: Workout | null
  status: WeekDayStatus
}

export interface WeekSummary {
  days: WeekDay[]
  scheduledCount: number
  completedCount: number
}

export const startOfWeek = (today: Date): Date => {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const offset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - offset)
  return start
}

export const buildWeek = (
  today: Date,
  structure: Workout[],
  history: WorkoutTracker[]
): WeekSummary => {
  const byWeekday = new Map<number, Workout>()
  for (const workout of structure) {
    const index = getDayIndex(workout.day)
    if (index !== null && !byWeekday.has(index)) byWeekday.set(index, workout)
  }

  const loggedDates = new Set(
    history
      .filter((entry) => entry.has_worked_out && entry.date)
      .map((entry) => entry.date)
  )

  const todayKey = localDateString(today)
  const start = startOfWeek(today)
  const days: WeekDay[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = localDateString(date)
    const dayIndex = date.getDay()
    const workout = byWeekday.get(dayIndex) ?? null
    const isToday = key === todayKey

    let status: WeekDayStatus
    if (loggedDates.has(key)) status = 'done'
    else if (!workout) status = 'rest'
    else if (isToday) status = 'today'
    else if (key < todayKey) status = 'missed'
    else status = 'planned'

    days.push({
      date: key,
      dayIndex,
      shortName: DAY_NAMES[dayIndex].slice(0, 3),
      dayOfMonth: date.getDate(),
      isToday,
      workout,
      status
    })
  }

  return {
    days,
    scheduledCount: days.filter((day) => day.workout).length,
    completedCount: days.filter((day) => day.status === 'done').length
  }
}
