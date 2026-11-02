// @vitest-environment happy-dom
import { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileSetList } from './MobileSetList'

const props = (
  overrides: Partial<ComponentProps<typeof MobileSetList>> = {}
): ComponentProps<typeof MobileSetList> => ({
  exercise: { name: 'Bench Press', sets: 2, reps: 8, exercise_tip: 'Pause' },
  sets: [
    { reps: '8', weight: '135', notes: '' },
    { reps: '', weight: '', notes: 'Felt good' }
  ],
  selectedSet: 1,
  unit: 'lb',
  onSelect: vi.fn(),
  onAddSet: vi.fn(),
  onRemoveSet: vi.fn(),
  onNoteChange: vi.fn(),
  onClearSet: vi.fn(),
  ...overrides
})

describe('MobileSetList', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(cleanup)

  it('shows logged values and target reps', () => {
    render(<MobileSetList {...props()} />)
    expect(screen.getByText('135 lb × 8')).toBeTruthy()
    expect(screen.getByText('8 reps')).toBeTruthy()
  })

  it('shows last session’s numbers on unlogged sets', () => {
    render(
      <MobileSetList
        {...props({
          previous: {
            date: '2026-10-30',
            sets: [{ set_number: 2, reps: 6, weight: 140, weight_unit: 'lb' }]
          }
        })}
      />
    )
    expect(screen.getByText('140 lb × 6')).toBeTruthy()
  })

  it('outlines only the selected set', () => {
    render(<MobileSetList {...props()} />)
    const selected = screen.getByRole('button', { name: /^Set 2/ })
    const other = screen.getByRole('button', { name: /^Set 1/ })
    expect(selected.getAttribute('aria-current')).toBe('true')
    expect(selected.className).toContain('border-app-colors-300')
    expect(other.getAttribute('aria-current')).toBeNull()
    expect(other.className).not.toContain('border-app-colors-300')
  })

  it('selects a tapped set', () => {
    const onSelect = vi.fn()
    render(<MobileSetList {...props({ onSelect })} />)
    fireEvent.click(screen.getByRole('button', { name: /^Set 1/ }))
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('edits the selected set’s note', () => {
    const onNoteChange = vi.fn()
    render(<MobileSetList {...props({ onNoteChange })} />)
    const note = screen.getByLabelText('Set 2 notes') as HTMLInputElement
    expect(note.value).toBe('Felt good')
    fireEvent.change(note, { target: { value: 'Heavy' } })
    expect(onNoteChange).toHaveBeenCalledWith(1, 'Heavy')
  })

  it('names the set the note belongs to', () => {
    render(<MobileSetList {...props()} />)
    expect(screen.getByPlaceholderText('Note for set 2')).toBeTruthy()
  })

  it('offers clear set only when the selected set is logged', () => {
    const onClearSet = vi.fn()
    const { rerender } = render(<MobileSetList {...props({ onClearSet })} />)
    expect(screen.queryByRole('button', { name: /Clear set/ })).toBeNull()
    rerender(<MobileSetList {...props({ onClearSet, selectedSet: 0 })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear set 1' }))
    expect(onClearSet).toHaveBeenCalledWith(0)
  })

  it('hides the note field when no set is selected', () => {
    render(<MobileSetList {...props({ selectedSet: null })} />)
    expect(screen.queryByLabelText(/notes/)).toBeNull()
  })

  it('adds and removes sets, hiding remove at the minimum', () => {
    const onAddSet = vi.fn()
    const onRemoveSet = vi.fn()
    const { rerender } = render(
      <MobileSetList {...props({ onAddSet, onRemoveSet })} />
    )
    fireEvent.click(screen.getByRole('button', { name: /Add a set/ }))
    fireEvent.click(screen.getByRole('button', { name: /Remove set 2/ }))
    expect(onAddSet).toHaveBeenCalled()
    expect(onRemoveSet).toHaveBeenCalled()

    rerender(
      <MobileSetList
        {...props({
          sets: [{ reps: '', weight: '', notes: '' }],
          selectedSet: 0
        })}
      />
    )
    expect(screen.queryByRole('button', { name: /Remove set/ })).toBeNull()
  })

  it('scrolls the selected set into view when the selection changes', () => {
    const { rerender } = render(<MobileSetList {...props()} />)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    rerender(<MobileSetList {...props({ selectedSet: 0 })} />)
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' })
  })
})
