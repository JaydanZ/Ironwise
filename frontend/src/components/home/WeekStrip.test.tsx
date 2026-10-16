// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { Workout } from '@/types/programCreation'
import { WeekStrip } from './WeekStrip'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate
}))

const structure: Workout[] = [
  {
    day: 'Monday',
    focus: 'Push',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 6, exercise_tip: 'Pause on chest' },
      { name: 'Overhead Press', sets: 3, reps: 8 }
    ]
  },
  {
    day: 'Thursday',
    focus: 'Legs',
    exercises: [{ name: 'Back Squat', sets: 5, reps: 5 }]
  }
]

const dayButton = (name: RegExp) => screen.getByRole('button', { name })

describe('WeekStrip day dialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // Thursday, 15 Oct 2026
    vi.setSystemTime(new Date(2026, 9, 15, 9))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    navigate.mockClear()
  })

  it('only makes workout days tappable', () => {
    render(<WeekStrip structure={structure} history={[]} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Wed 14/ })).toBeNull()
  })

  it('shows the focus and every exercise for the tapped day', async () => {
    render(<WeekStrip structure={structure} history={[]} />)
    fireEvent.click(dayButton(/Mon 12, Push/))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Push' })).toBeTruthy()
    expect(within(dialog).getByText('Monday, Oct 12')).toBeTruthy()
    expect(within(dialog).getByText('Missed')).toBeTruthy()
    expect(within(dialog).getByText('2 exercises')).toBeTruthy()
    expect(within(dialog).getByText('Bench Press')).toBeTruthy()
    expect(within(dialog).getByText('Pause on chest')).toBeTruthy()
    expect(within(dialog).getByText('Overhead Press')).toBeTruthy()
    expect(within(dialog).queryByText('Back Squat')).toBeNull()
  })

  it('closes on Escape and returns focus to the day', async () => {
    render(<WeekStrip structure={structure} history={[]} />)
    const trigger = dayButton(/Thu 15, Legs/)
    fireEvent.click(trigger)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Today')).toBeTruthy()
    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('closes from the close button', async () => {
    render(<WeekStrip structure={structure} history={[]} />)
    fireEvent.click(dayButton(/Thu 15, Legs/))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('WeekStrip start workout', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 15, 9))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    navigate.mockClear()
  })

  it('starts the tapped day of the active program', async () => {
    render(<WeekStrip programId="prog-1" structure={structure} history={[]} />)
    fireEvent.click(dayButton(/Thu 15, Legs/))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Start workout' })
    )
    expect(navigate).toHaveBeenCalledWith({
      to: '/workout',
      search: { programId: 'prog-1', day: 'Thursday' }
    })
  })

  it('hides the button when there is no program to start', async () => {
    render(<WeekStrip structure={structure} history={[]} />)
    fireEvent.click(dayButton(/Thu 15, Legs/))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: /Start/ })).toBeNull()
  })
})
