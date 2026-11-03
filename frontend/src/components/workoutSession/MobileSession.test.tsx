// @vitest-environment happy-dom
import { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen
} from '@testing-library/react'
import { Workout } from '@/types/programCreation'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { Toaster } from '@/components/ui/toaster'
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
      units={session.state.units}
      allComplete={session.progress.allComplete}
      completedSets={session.progress.completedSets}
      isSubmitting={false}
      errorMessage={null}
      onFill={session.fillSet}
      onUpdateSet={session.updateSet}
      onAddSet={session.addSet}
      onRemoveSet={session.removeSet}
      onRestoreSet={session.restoreSet}
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
const unitOption = (unit: string) => screen.getByRole('radio', { name: unit })
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

  it('changes the unit of only the current exercise', () => {
    render(<Harness />)
    fireEvent.click(unitOption('kg'))
    expect(unitOption('kg').getAttribute('aria-checked')).toBe('true')

    done()
    done()

    expect(heading()).toBe('Pull Up')
    expect(unitOption('lb').getAttribute('aria-checked')).toBe('true')
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

  const threeSets = {
    ...workout,
    exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }]
  }
  const weightValue = () =>
    (screen.getByLabelText('Weight in lb') as HTMLInputElement).value

  it('removes the tapped row, not the last one', () => {
    render(<Harness plan={threeSets} />)
    done()
    fireEvent.click(screen.getByRole('button', { name: /Remove set 2/ }))
    expect(screen.getByText('Set 2 of 2')).toBeTruthy()
    expect(setButton(1).getAttribute('aria-label')).toContain('logged')
    expect(setButton(2).getAttribute('aria-label')).not.toContain('logged')
  })

  it('stays on the selected set when an earlier set is removed', () => {
    render(<Harness plan={threeSets} />)
    fireEvent.click(setButton(3))
    fireEvent.click(screen.getByRole('button', { name: /Remove set 1/ }))
    expect(setButton(2).getAttribute('aria-current')).toBe('true')
    expect(screen.getByText('Set 2 of 2')).toBeTruthy()
  })

  it('stays on the selected set when a later set is removed', () => {
    render(<Harness plan={threeSets} />)
    fireEvent.click(setButton(2))
    fireEvent.click(screen.getByRole('button', { name: /Remove set 3/ }))
    expect(setButton(2).getAttribute('aria-current')).toBe('true')
  })

  it('drops the panel values of a removed set', () => {
    render(<Harness plan={threeSets} />)
    fireEvent.click(screen.getByRole('button', { name: 'Increase weight' }))
    done()
    fireEvent.click(screen.getByRole('button', { name: 'Increase weight' }))
    expect(weightValue()).toBe('10')

    fireEvent.click(screen.getByRole('button', { name: /Remove set 2/ }))

    expect(screen.getByText('Set 2 of 2')).toBeTruthy()
    expect(weightValue()).toBe('5')
  })

  const undoButton = () => screen.queryByRole('button', { name: 'Undo' })
  const removeSet = (number: number) =>
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`Remove set ${number}`) })
    )

  it('offers to undo removing a set', () => {
    render(
      <>
        <Harness plan={threeSets} />
        <Toaster />
      </>
    )
    removeSet(2)
    expect(screen.getByText('Set 2 removed')).toBeTruthy()
    expect(undoButton()).toBeTruthy()
  })

  it('puts a logged set back with its values and note when undone', () => {
    render(
      <>
        <Harness plan={threeSets} />
        <Toaster />
      </>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Increase weight' }))
    done()
    fireEvent.click(setButton(1))
    fireEvent.change(screen.getByLabelText('Set 1 notes'), {
      target: { value: 'Heavy' }
    })
    removeSet(1)
    expect(screen.getByText('Set 1 of 2')).toBeTruthy()

    fireEvent.click(undoButton() as HTMLElement)

    expect(setButton(1).getAttribute('aria-label')).toContain('5 lb × 8')
    expect(setButton(1).getAttribute('aria-label')).toContain('logged')
    expect(setButton(2).getAttribute('aria-current')).toBe('true')
    fireEvent.click(setButton(1))
    expect(
      (screen.getByLabelText('Set 1 notes') as HTMLInputElement).value
    ).toBe('Heavy')
  })

  it('restores a set only once on a double tap of undo', () => {
    render(
      <>
        <Harness plan={threeSets} />
        <Toaster />
      </>
    )
    removeSet(2)
    const undo = undoButton() as HTMLElement

    act(() => {
      undo.click()
      undo.click()
    })

    expect(screen.getByText('Set 1 of 3')).toBeTruthy()
    expect(undoButton()).toBeNull()
  })

  it('returns to the exercise when a set from another one is restored', () => {
    render(
      <>
        <Harness />
        <Toaster />
      </>
    )
    removeSet(2)
    done()
    expect(heading()).toBe('Pull Up')

    fireEvent.click(undoButton() as HTMLElement)

    expect(heading()).toBe('Bench Press')
    expect(screen.getByText('Set 2 of 2')).toBeTruthy()
  })

  it('withdraws the undo when the session closes', () => {
    const { rerender } = render(
      <>
        <Harness plan={threeSets} />
        <Toaster />
      </>
    )
    removeSet(2)
    expect(undoButton()).toBeTruthy()

    rerender(
      <>
        {null}
        <Toaster />
      </>
    )

    expect(undoButton()).toBeNull()
  })

  const swipeFrom = async (target: Element, fromX: number, toX: number) => {
    // happy-dom drops pageX from the event init, and Motion measures drags with it
    const firePointer = (
      type: 'pointerDown' | 'pointerMove' | 'pointerUp',
      node: Element | Window,
      clientX: number
    ) => {
      const event = createEvent[type](node, {
        clientX,
        clientY: 300,
        pointerType: 'touch',
        isPrimary: true,
        button: 0
      })
      Object.defineProperty(event, 'pageX', { value: clientX })
      Object.defineProperty(event, 'pageY', { value: 300 })
      fireEvent(node, event)
    }
    const nextFrame = () =>
      act(
        () => new Promise<void>((done) => requestAnimationFrame(() => done()))
      )
    firePointer('pointerDown', target, fromX)
    await nextFrame()
    for (const clientX of [fromX + (toX - fromX) / 2, toX]) {
      firePointer('pointerMove', window, clientX)
      await nextFrame()
    }
    const transformWhileDragging =
      target.closest<HTMLElement>('[style*="transform"]')?.style.transform ?? ''
    firePointer('pointerUp', window, toX)
    await nextFrame()
    return transformWhileDragging
  }
  const image = () => screen.getByRole('img', { name: /image placeholder/ })

  it('goes to the next exercise on a swipe left', async () => {
    render(<Harness />)
    await swipeFrom(image(), 300, 50)
    expect(heading()).toBe('Pull Up')
  })

  it('goes back on a swipe right, even past a finished exercise', async () => {
    render(<Harness />)
    done()
    done()
    expect(heading()).toBe('Pull Up')
    await swipeFrom(image(), 50, 300)
    expect(heading()).toBe('Bench Press')
    expect(setButton(1).getAttribute('aria-label')).toContain('logged')
  })

  it('stays on the first exercise when swiping right', async () => {
    render(<Harness />)
    await swipeFrom(image(), 50, 300)
    expect(screen.getByText('Set 1 of 2')).toBeTruthy()
  })

  it('moves the content with the finger when there is an exercise that way', async () => {
    render(<Harness />)
    expect(await swipeFrom(image(), 300, 200)).toContain('translateX')
  })

  it('keeps the content still when there is no exercise that way', async () => {
    render(<Harness />)
    expect(await swipeFrom(image(), 50, 300)).not.toContain('translateX')
  })

  it('leaves the logging panel out of the swipe area', async () => {
    render(<Harness />)
    await swipeFrom(doneButton(), 300, 50)
    expect(screen.getByText('Set 1 of 2')).toBeTruthy()
  })

  it('does not swipe from the note field', async () => {
    render(<Harness />)
    await swipeFrom(screen.getByLabelText('Set 1 notes'), 300, 50)
    expect(screen.getByText('Set 1 of 2')).toBeTruthy()
  })

  it('does not swipe from the screen edge', async () => {
    render(<Harness />)
    await swipeFrom(image(), window.innerWidth - 5, 50)
    expect(screen.getByText('Set 1 of 2')).toBeTruthy()
  })

  it('slides a later exercise in from the right', () => {
    render(<Harness />)
    done()
    done()
    expect(image().parentElement?.className).toContain('slide-in-from-right')
  })

  it('slides an earlier exercise in from the left', () => {
    render(
      <>
        <Harness />
        <Toaster />
      </>
    )
    removeSet(2)
    done()
    expect(heading()).toBe('Pull Up')
    fireEvent.click(undoButton() as HTMLElement)
    expect(heading()).toBe('Bench Press')
    expect(image().parentElement?.className).toContain('slide-in-from-left')
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
