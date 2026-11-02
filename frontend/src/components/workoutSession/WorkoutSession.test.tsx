// @vitest-environment happy-dom
import { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { Workout } from '@/types/programCreation'
import { WorkoutSession } from './WorkoutSession'

const submitWorkout = vi.fn(() => ({
  unwrap: () => Promise.reject(new Error('offline'))
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn()
}))

vi.mock('@/services/protectedRoutesAPI', () => ({
  useGetPreviousPerformanceQuery: () => ({
    data: undefined,
    isLoading: false
  }),
  useSubmitWorkoutMutation: () => [
    submitWorkout,
    { isLoading: false, isError: false }
  ]
}))

const workout: Workout = {
  day: 'Monday',
  focus: 'Push',
  exercises: [{ name: 'Pull Up', sets: 1, reps: 10 }]
}

const renderAt = (width: number) => {
  window.innerWidth = width
  render(<WorkoutSession programId="p1" programName="Plan" workout={workout} />)
}

const originalWidth = window.innerWidth

describe('WorkoutSession layouts', () => {
  beforeEach(() => {
    window.localStorage.clear()
    submitWorkout.mockClear()
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    window.innerWidth = originalWidth
    vi.restoreAllMocks()
  })

  it('renders the mobile session under 800px', () => {
    renderAt(390)
    expect(screen.getByRole('button', { name: 'Mark set done' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Exercises' })).toBeNull()
  })

  it('keeps the desktop layout at 800px and up', () => {
    renderAt(800)
    expect(screen.getByRole('heading', { name: 'Exercises' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mark set done' })).toBeNull()
  })

  it('submits sets logged on mobile with a blank weight as null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers({ toFake: ['Date'] })
    renderAt(390)
    fireEvent.click(screen.getByRole('button', { name: 'Mark set done' }))
    vi.setSystemTime(Date.now() + 1000)
    fireEvent.click(screen.getByRole('button', { name: 'Submit workout' }))
    await waitFor(() => expect(submitWorkout).toHaveBeenCalledTimes(1))
    expect(submitWorkout.mock.calls[0]).toMatchObject([
      {
        is_completed: true,
        sets: [{ exercise_name: 'Pull Up', reps: 10, weight: null }]
      }
    ])
  })
})
