// @vitest-environment happy-dom
import { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Workout } from '@/types/programCreation'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { MobileSession } from './MobileSession'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: ReactNode
    to: string
    'aria-label'?: string
    className?: string
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  )
}))

const workout: Workout = {
  day: 'Monday',
  focus: 'Push',
  exercises: [
    { name: 'Bench Press', sets: 2, reps: 8 },
    { name: 'Pull Up', sets: 1, reps: 10 },
    { name: 'Bench Press', sets: 3, reps: 5 }
  ]
}

const submit = vi.fn()

const Harness = ({ plan = workout }: { plan?: Workout }) => {
  const session = useWorkoutSession({ programId: 'p1', workout: plan })
  return (
    <MobileSession
      workout={plan}
      entries={session.state.entries}
      unit={session.state.unit}
      allComplete={session.progress.allComplete}
      completedSets={session.progress.completedSets}
      isSubmitting={false}
      errorMessage={null}
      onFill={session.fillSet}
      onUpdateSet={session.updateSet}
      onAddSet={session.addSet}
      onRemoveSet={session.removeSet}
      onUnitChange={session.setUnit}
      onFinishEarly={vi.fn()}
      onSubmit={submit}
    />
  )
}

const heading = () => screen.getByRole('heading', { level: 1 }).textContent
const doneButton = () => screen.getByRole('button', { name: 'Mark set done' })
const laterTap = () => vi.setSystemTime(Date.now() + 1000)
const done = () => {
  laterTap()
  fireEvent.click(doneButton())
}
const setButton = (number: number) =>
  screen.getByRole('button', { name: new RegExp(`^Set ${number}`) })

describe('MobileSession', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    window.localStorage.clear()
    submit.mockClear()
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('sets the session in Inter without Roboto Condensed overriding it', () => {
    const { container } = render(<Harness />)
    expect(container.firstElementChild?.classList).toContain('font-inter')
    expect(container.querySelector('.font-display')).toBeNull()
  })

  it('shows the exercise tip between the image and the sets', () => {
    const plan = {
      ...workout,
      exercises: [{ ...workout.exercises[0], exercise_tip: 'Pause at the chest' }]
    }
    render(<Harness plan={plan} />)
    const tip = screen.getByText('Pause at the chest')
    const image = screen.getByRole('img', { name: /image placeholder/ })
    expect(image.compareDocumentPosition(tip)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(tip.compareDocumentPosition(setButton(1))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('ignores the second tap of a double tap on done', () => {
    render(<Harness />)
    done()
    fireEvent.click(doneButton())
    expect(screen.getByText('Set 2 of 2')).toBeTruthy()
    expect(setButton(2).getAttribute('aria-label')).not.toContain('logged')
  })

  it('ignores a double tap that lands on submit', () => {
    const plan = { ...workout, exercises: [workout.exercises[1]] }
    render(<Harness plan={plan} />)
    done()
    const submitButton = screen.getByRole('button', { name: 'Submit workout' })
    fireEvent.click(submitButton)
    expect(submit).not.toHaveBeenCalled()
    laterTap()
    fireEvent.click(submitButton)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('un-logs a set with clear set', () => {
    render(<Harness />)
    done()
    fireEvent.click(setButton(1))
    fireEvent.click(screen.getByRole('button', { name: 'Clear set 1' }))
    expect(setButton(1).getAttribute('aria-label')).not.toContain('logged')
    expect(setButton(1).getAttribute('aria-current')).toBe('true')
  })

  it('keeps focus on done across sets and exercises', () => {
    render(<Harness />)
    doneButton().focus()
    done()
    expect(document.activeElement).toBe(doneButton())
    done()
    expect(heading()).toBe('Pull Up')
    expect(document.activeElement).toBe(doneButton())
  })

  it('moves focus to submit when the last set is done', () => {
    const plan = { ...workout, exercises: [workout.exercises[1]] }
    render(<Harness plan={plan} />)
    doneButton().focus()
    done()
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Submit workout' })
    )
  })

  it('returns to submit when the set being edited is removed', () => {
    const plan = { ...workout, exercises: [workout.exercises[0]] }
    render(<Harness plan={plan} />)
    done()
    done()
    fireEvent.click(setButton(2))
    fireEvent.click(screen.getByRole('button', { name: /Remove set 2/ }))
    expect(screen.getByRole('button', { name: 'Submit workout' })).toBeTruthy()
  })

  it('starts on the first exercise and first set', () => {
    render(<Harness />)
    expect(heading()).toBe('Bench Press')
    expect(screen.getByText('Set 1 of 2')).toBeTruthy()
    expect(setButton(1).getAttribute('aria-current')).toBe('true')
  })

  it('moves to the next set after done', () => {
    render(<Harness />)
    done()
    expect(heading()).toBe('Bench Press')
    expect(screen.getByText('Set 2 of 2')).toBeTruthy()
    expect(setButton(1).getAttribute('aria-label')).toContain('logged')
  })

  it('advances to the next exercise after its last set', () => {
    render(<Harness />)
    done()
    done()
    expect(heading()).toBe('Pull Up')
    expect(screen.getByText('Set 1 of 1')).toBeTruthy()
  })

  it('treats a repeated exercise name as its own exercise', () => {
    render(<Harness />)
    done()
    done()
    done()
    expect(heading()).toBe('Bench Press')
    expect(screen.getByText('Set 1 of 3')).toBeTruthy()
  })

  it('shows submit after the last set of the workout', () => {
    const plan = { ...workout, exercises: [workout.exercises[1]] }
    render(<Harness plan={plan} />)
    done()
    expect(screen.getByRole('button', { name: 'Submit workout' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mark set done' })).toBeNull()
  })

  it('edits from the submit state and returns to submit', () => {
    const plan = { ...workout, exercises: [workout.exercises[1]] }
    render(<Harness plan={plan} />)
    done()
    fireEvent.click(setButton(1))
    fireEvent.click(screen.getByRole('button', { name: 'Increase reps' }))
    done()
    expect(screen.getByRole('button', { name: 'Submit workout' })).toBeTruthy()
    expect(setButton(1).getAttribute('aria-label')).toContain('11 reps')
  })

  it('returns to logging when a set is added from the submit state', () => {
    const plan = { ...workout, exercises: [workout.exercises[1]] }
    render(<Harness plan={plan} />)
    done()
    fireEvent.click(screen.getByRole('button', { name: /Add a set/ }))
    expect(screen.getByText('Set 2 of 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mark set done' })).toBeTruthy()
  })

  it('jumps to the next exercise when the grey text is tapped', () => {
    render(<Harness />)
    done()
    done()
    fireEvent.click(
      screen.getByRole('button', { name: 'Next exercise: Bench Press' })
    )
    expect(heading()).toBe('Bench Press')
    expect(screen.getByText('Set 1 of 3')).toBeTruthy()
  })

  it('stays on a finished exercise when one of its sets is edited', () => {
    const plan = {
      ...workout,
      exercises: [
        { name: 'Bench Press', sets: 1, reps: 8 },
        { name: 'Pull Up', sets: 1, reps: 10 },
        { name: 'Squat', sets: 1, reps: 5 }
      ]
    }
    render(<Harness plan={plan} />)
    done()
    expect(heading()).toBe('Pull Up')
    done()
    expect(heading()).toBe('Squat')
    done()
    fireEvent.click(setButton(1))
    done()
    expect(heading()).toBe('Squat')
  })

  it('falls back to the default set when the selected set is removed', () => {
    render(<Harness />)
    fireEvent.click(setButton(2))
    fireEvent.click(screen.getByRole('button', { name: /Remove set 2/ }))
    expect(setButton(1).getAttribute('aria-current')).toBe('true')
  })

  it('carries the logged values to the next set', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Increase weight' }))
    done()
    expect(
      (screen.getByLabelText('Weight in lb') as HTMLInputElement).value
    ).toBe('5')
    expect((screen.getByLabelText('Reps') as HTMLInputElement).value).toBe('8')
  })

  it('announces the current exercise and set', () => {
    render(<Harness />)
    expect(screen.getByRole('status').textContent).toBe('Bench Press, set 1 of 2')
  })

  it('marks <body> only while mounted, so the bottom nav can hide', () => {
    const { unmount } = render(<Harness />)
    expect(document.body.hasAttribute('data-workout-session')).toBe(true)
    unmount()
    expect(document.body.hasAttribute('data-workout-session')).toBe(false)
  })
})
