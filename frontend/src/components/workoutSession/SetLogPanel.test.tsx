// @vitest-environment happy-dom
import { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SetLogPanel } from './SetLogPanel'

const props = (
  overrides: Partial<ComponentProps<typeof SetLogPanel>> = {}
): ComponentProps<typeof SetLogPanel> => ({
  resetKey: '0:1:lb',
  setNumber: 2,
  totalSets: 4,
  seed: { weight: '135', reps: '8' },
  unit: 'lb',
  lastText: '135 lb × 8',
  showSubmit: false,
  showFinishEarly: true,
  canFinishEarly: true,
  isSubmitting: false,
  errorMessage: null,
  onUnitChange: vi.fn(),
  onFinishEarly: vi.fn(),
  onDone: vi.fn(),
  onSubmit: vi.fn(),
  ...overrides
})

const button = (name: string) => screen.getByRole('button', { name })
const weight = () => screen.getByLabelText('Weight in lb') as HTMLInputElement
const reps = () => screen.getByLabelText('Reps') as HTMLInputElement

describe('SetLogPanel', () => {
  afterEach(cleanup)

  it('shows the set position and last session', () => {
    render(<SetLogPanel {...props()} />)
    expect(screen.getByText('Set 2 of 4 · Last 135 lb × 8')).toBeTruthy()
  })

  it('steps both values and sends them on done', () => {
    const onDone = vi.fn()
    render(<SetLogPanel {...props({ onDone })} />)
    fireEvent.click(button('Increase weight'))
    fireEvent.click(button('Decrease reps'))
    fireEvent.click(button('Mark set done'))
    expect(onDone).toHaveBeenCalledWith({ weight: '140', reps: '7' })
  })

  it('sanitizes typed values', () => {
    render(<SetLogPanel {...props()} />)
    fireEvent.change(weight(), { target: { value: '12a,5' } })
    fireEvent.change(reps(), { target: { value: '1x2' } })
    expect(weight().value).toBe('12.5')
    expect(reps().value).toBe('12')
  })

  it('disables done while reps are blank but allows a blank weight', () => {
    const onDone = vi.fn()
    render(<SetLogPanel {...props({ onDone })} />)
    fireEvent.change(weight(), { target: { value: '' } })
    fireEvent.change(reps(), { target: { value: '' } })
    expect((button('Mark set done') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(reps(), { target: { value: '12' } })
    fireEvent.click(button('Mark set done'))
    expect(onDone).toHaveBeenCalledWith({ weight: '', reps: '12' })
  })

  it('takes late-loading values when nothing has been changed', () => {
    const { rerender } = render(
      <SetLogPanel {...props({ seed: { weight: '', reps: '8' } })} />
    )
    rerender(<SetLogPanel {...props({ seed: { weight: '135', reps: '6' } })} />)
    expect(weight().value).toBe('135')
    expect(reps().value).toBe('6')
  })

  it('keeps the user’s values when last session loads late', () => {
    const { rerender } = render(
      <SetLogPanel {...props({ seed: { weight: '', reps: '8' } })} />
    )
    fireEvent.click(button('Increase reps'))
    rerender(<SetLogPanel {...props({ seed: { weight: '135', reps: '6' } })} />)
    expect(weight().value).toBe('')
    expect(reps().value).toBe('9')
  })

  it('takes the new set’s values on reset, even after edits', () => {
    const { rerender } = render(<SetLogPanel {...props()} />)
    fireEvent.click(button('Increase reps'))
    rerender(
      <SetLogPanel
        {...props({ resetKey: '0:2:lb', seed: { weight: '140', reps: '6' } })}
      />
    )
    expect(weight().value).toBe('140')
    expect(reps().value).toBe('6')
  })

  it('swaps the controls for submit when every set is logged', () => {
    const onSubmit = vi.fn()
    render(
      <SetLogPanel
        {...props({ showSubmit: true, showFinishEarly: false, onSubmit })}
      />
    )
    expect(screen.queryByRole('button', { name: 'Mark set done' })).toBeNull()
    fireEvent.click(button('Submit workout'))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('shows submit errors and disables finish early until a set is logged', () => {
    render(
      <SetLogPanel {...props({ errorMessage: 'Nope', canFinishEarly: false })} />
    )
    expect(screen.getByRole('alert').textContent).toBe('Nope')
    expect((button('Finish early') as HTMLButtonElement).disabled).toBe(true)
  })
})
