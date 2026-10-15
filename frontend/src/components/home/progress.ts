import { LiftSession, LiftSet, WeightUnit } from '@/types/workoutSession'

const LB_PER_KG = 2.20462
const RECORD_EPSILON_KG = 0.05

export interface BestSet {
  reps: number
  weight: number
  unit: WeightUnit
  e1rm: number
}

export interface PersonalRecord {
  exercise: string
  date: string
  set: BestSet
  previousE1rm: number
}

export interface TrendPoint {
  date: string
  set: BestSet
  value: number
}

export interface ExerciseTrend {
  exercise: string
  unit: WeightUnit
  points: TrendPoint[]
}

export const estimateOneRepMax = (weight: number, reps: number): number =>
  reps === 1 ? weight : weight * (1 + reps / 30)

export const toKg = (weight: number, unit: WeightUnit): number =>
  unit === 'kg' ? weight : weight / LB_PER_KG

export const convertWeight = (
  weight: number,
  from: WeightUnit,
  to: WeightUnit
): number => {
  if (from === to) return weight
  return to === 'kg' ? weight / LB_PER_KG : weight * LB_PER_KG
}

const exerciseKey = (name: string) => name.trim().toLowerCase()

const bestSetOf = (sets: LiftSet[]): BestSet | null => {
  let best: BestSet | null = null
  let bestKg = -Infinity
  for (const set of sets) {
    if (set.weight === null || set.weight <= 0 || !set.reps || set.reps <= 0)
      continue
    const e1rm = estimateOneRepMax(set.weight, set.reps)
    const kg = toKg(e1rm, set.weight_unit)
    if (kg > bestKg) {
      bestKg = kg
      best = { reps: set.reps, weight: set.weight, unit: set.weight_unit, e1rm }
    }
  }
  return best
}

interface Session {
  date: string
  exercise: string
  best: BestSet
}

const sessionsByExercise = (
  workouts: LiftSession[]
): Map<string, Session[]> => {
  const chronological = [...workouts].sort((a, b) =>
    a.date === b.date ? 0 : a.date < b.date ? -1 : 1
  )
  const map = new Map<string, Session[]>()
  for (const workout of chronological) {
    for (const exercise of workout.exercises) {
      const best = bestSetOf(exercise.sets)
      if (!best) continue
      const key = exerciseKey(exercise.name)
      const sessions = map.get(key) ?? []
      sessions.push({ date: workout.date, exercise: exercise.name, best })
      map.set(key, sessions)
    }
  }
  return map
}

// A record needs something to beat, so an exercise's first session never counts
export const findRecentRecords = (
  workouts: LiftSession[],
  limit = 3
): PersonalRecord[] => {
  const records: PersonalRecord[] = []
  for (const sessions of sessionsByExercise(workouts).values()) {
    let bestKg = toKg(sessions[0].best.e1rm, sessions[0].best.unit)
    let bestSession = sessions[0]
    for (const session of sessions.slice(1)) {
      const kg = toKg(session.best.e1rm, session.best.unit)
      if (kg > bestKg + RECORD_EPSILON_KG) {
        records.push({
          exercise: session.exercise,
          date: session.date,
          set: session.best,
          previousE1rm: convertWeight(
            bestSession.best.e1rm,
            bestSession.best.unit,
            session.best.unit
          )
        })
        bestKg = kg
        bestSession = session
      }
    }
  }

  // Keep only each exercise's latest record so one lift can't fill the list
  const latestPerExercise = new Map<string, PersonalRecord>()
  for (const record of records) {
    const key = exerciseKey(record.exercise)
    const current = latestPerExercise.get(key)
    if (!current || record.date >= current.date)
      latestPerExercise.set(key, record)
  }

  return [...latestPerExercise.values()]
    .sort((a, b) => (a.date === b.date ? 0 : a.date > b.date ? -1 : 1))
    .slice(0, limit)
}

export interface BestLift {
  exercise: string
  date: string
  set: BestSet
}

// Each exercise's top set, heaviest first. Fills the panel before any records exist.
export const findBestLifts = (
  workouts: LiftSession[],
  limit = 3
): BestLift[] => {
  const bests: { lift: BestLift; kg: number }[] = []
  for (const sessions of sessionsByExercise(workouts).values()) {
    let best = sessions[0]
    let bestKg = toKg(best.best.e1rm, best.best.unit)
    for (const session of sessions.slice(1)) {
      const kg = toKg(session.best.e1rm, session.best.unit)
      if (kg > bestKg) {
        best = session
        bestKg = kg
      }
    }
    bests.push({
      lift: { exercise: best.exercise, date: best.date, set: best.best },
      kg: bestKg
    })
  }
  return bests
    .sort((a, b) => b.kg - a.kg)
    .slice(0, limit)
    .map(({ lift }) => lift)
}

// Exercises with at least two weighted sessions, most trained first
export const trendExercises = (workouts: LiftSession[]): string[] =>
  [...sessionsByExercise(workouts).values()]
    .filter((sessions) => sessions.length >= 2)
    .sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length
      const lastA = a[a.length - 1].date
      const lastB = b[b.length - 1].date
      return lastA === lastB ? 0 : lastA > lastB ? -1 : 1
    })
    .map((sessions) => sessions[sessions.length - 1].exercise)

export const buildExerciseTrend = (
  workouts: LiftSession[],
  exercise: string
): ExerciseTrend | null => {
  const sessions = sessionsByExercise(workouts).get(exerciseKey(exercise))
  if (!sessions?.length) return null

  // Plot in whatever unit the lifter used most recently
  const latest = sessions[sessions.length - 1]
  const unit = latest.best.unit

  return {
    exercise: latest.exercise,
    unit,
    points: sessions.map((session) => ({
      date: session.date,
      set: session.best,
      value: convertWeight(session.best.e1rm, session.best.unit, unit)
    }))
  }
}

export const formatWeight = (weight: number): string =>
  String(Math.round(weight * 10) / 10)
