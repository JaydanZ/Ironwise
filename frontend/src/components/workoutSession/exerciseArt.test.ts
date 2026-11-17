import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import catalogue from '@/data/exerciseCatalogue.json'
import {
  exerciseArtUrl,
  normaliseExerciseName,
  REVIEWED_NAMES
} from './exerciseArt'

const ART_URL = 'https://art.test/0f11ea468074'

describe('normaliseExerciseName', () => {
  it.each([
    ['  Bench   press ', 'bench press'],
    ['Push-Ups', 'push up'],
    ['Crunches', 'crunch'],
    ['DB Row', 'dumbbell row'],
    ['Cable Flyes', 'cable fly'],
    ['Bench Press', 'bench press']
  ])('turns %s into %s', (name, expected) => {
    expect(normaliseExerciseName(name)).toBe(expected)
  })
})

describe('exerciseArtUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_EXERCISE_ART_URL', ART_URL)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('finds a catalogue name however it is written', () => {
    const expected = `${ART_URL}/bench-press.svg`
    expect(exerciseArtUrl('Bench Press')).toBe(expected)
    expect(exerciseArtUrl('bench press')).toBe(expected)
    expect(exerciseArtUrl(' BENCH PRESS ')).toBe(expected)
  })

  it('uses the reviewed table for names the catalogue words differently', () => {
    expect(exerciseArtUrl('DB RDL')).toBe(
      `${ART_URL}/dumbbell-romanian-deadlift.svg`
    )
    expect(exerciseArtUrl('Leg Curls')).toBe(`${ART_URL}/lying-leg-curl.svg`)
  })

  it('never guesses from a similar name', () => {
    expect(exerciseArtUrl('Chest Fly')).toBeNull()
    expect(exerciseArtUrl('Wide Grip Upper Back Row')).toBeNull()
    expect(exerciseArtUrl('Bench Pres')).toBeNull()
  })

  it.each(['', '   ', 'constructor', '__proto__'])(
    'returns nothing for %j',
    (name) => {
      expect(exerciseArtUrl(name)).toBeNull()
    }
  )

  it('returns nothing when no art host is configured', () => {
    vi.stubEnv('VITE_EXERCISE_ART_URL', '')
    expect(exerciseArtUrl('Bench Press')).toBeNull()
  })

  it('only points the reviewed table at real drawings', () => {
    const ids = new Set(catalogue.map((exercise) => exercise.id))
    for (const [, id] of REVIEWED_NAMES) {
      expect(ids.has(id), id).toBe(true)
    }
  })
})
