// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen
} from '@testing-library/react'
import { createEntries } from '@/hooks/useWorkoutSession'
import { Exercise } from '@/types/programCreation'
import { ExerciseSwitcher } from './ExerciseSwitcher'

const exercises: Exercise[] = [
  { name: 'Bench Press', sets: 1, reps: 8 },
  { name: 'Pull Up', sets: 2, reps: 10 },
  { name: 'Bench Press', sets: 3, reps: 5 }
]

const setup = (nextIndex: number | null = 1) => {
  const onSelect = vi.fn()
  render(
    <ExerciseSwitcher
      exercises={exercises}
      entries={createEntries(exercises)}
      currentIndex={0}
      nextIndex={nextIndex}
      onSelect={onSelect}
    />
  )
  return onSelect
}

const control = () =>
  screen.getByRole('button', { name: 'Next exercise: Pull Up' })

const hold = () => {
  fireEvent.pointerDown(control(), { clientX: 0, clientY: 0 })
  act(() => {
    vi.advanceTimersByTime(450)
  })
}

describe('ExerciseSwitcher', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('jumps to the next exercise on a tap', () => {
    const onSelect = setup()
    fireEvent.pointerDown(control(), { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(control())
    fireEvent.click(control())
    expect(onSelect).toHaveBeenCalledWith(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens the list after a hold, and the following click does not jump', () => {
    const onSelect = setup()
    hold()
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.pointerUp(control())
    fireEvent.click(control())
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('sets the portalled list in Inter', () => {
    setup()
    hold()
    expect(screen.getByRole('menu').classList).toContain('font-inter')
  })

  it('does not open when released early', () => {
    setup()
    fireEvent.pointerDown(control(), { clientX: 0, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    fireEvent.pointerUp(control())
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('cancels the hold when the finger moves', () => {
    setup()
    fireEvent.pointerDown(control(), { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(control(), { clientX: 20, clientY: 0 })
    act(() => {
      vi.advanceTimersByTime(450)
    })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('selects repeated exercise names by position', () => {
    const onSelect = setup()
    hold()
    fireEvent.click(screen.getAllByRole('menuitem')[2])
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('labels the next exercise above its name', () => {
    setup()
    const label = screen.getByText('Next:')
    const name = screen.getByText('Pull Up')
    expect(control().contains(label)).toBe(true)
    expect(label.compareDocumentPosition(name)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('truncates a long next exercise name without hiding the label', () => {
    setup()
    expect(screen.getByText('Pull Up').className).toContain('truncate')
    expect(screen.getByText('Next:').className).not.toContain('truncate')
  })

  it('reads "Exercises" and opens the list on tap when nothing is next', () => {
    const onSelect = setup(null)
    const button = screen.getByRole('button', { name: 'Show exercises' })
    expect(button.textContent).toBe('Exercises')
    fireEvent.click(button)
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('has a hidden button for people who can’t press and hold', () => {
    setup()
    expect(screen.getByRole('button', { name: 'All exercises' })).toBeTruthy()
  })
})
