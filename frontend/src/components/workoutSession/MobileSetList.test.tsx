// @vitest-environment happy-dom
import { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from '@testing-library/react'
import { edgeFades, MobileSetList } from './MobileSetList'

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

  it('scrolls only the set rows, keeping the controls outside the list', () => {
    render(<MobileSetList {...props()} />)
    const list = screen.getByRole('list')
    expect(list.classList).toContain('overflow-y-auto')
    const add = screen.getByRole('button', { name: /^Add a set/ })
    expect(list.contains(add)).toBe(false)
    expect(list.contains(screen.getByRole('textbox'))).toBe(false)
  })

  it('gives the set rows a thin dark scrollbar', () => {
    render(<MobileSetList {...props()} />)
    const list = screen.getByRole('list')
    expect(list.classList).toContain('[scrollbar-color:#404040_transparent]')
    expect(list.classList).toContain('[scrollbar-width:thin]')
  })

  describe('edge fades', () => {
    const entry = { reps: '', weight: '', notes: '' }
    const size = (list: HTMLElement, scrollHeight: number, clientHeight: number) => {
      Object.defineProperty(list, 'scrollHeight', {
        value: scrollHeight,
        configurable: true
      })
      Object.defineProperty(list, 'clientHeight', {
        value: clientHeight,
        configurable: true
      })
    }
    const fade = (list: HTMLElement, edge: 'top' | 'bottom') =>
      list.style.getPropertyValue(`--fade-${edge}`)

    it('fades only the edges that have more rows past them', () => {
      const view = { clientHeight: 200, scrollHeight: 600 }
      expect(edgeFades({ ...view, scrollTop: 0 })).toEqual({ top: 0, bottom: 24 })
      expect(edgeFades({ ...view, scrollTop: 200 })).toEqual({
        top: 24,
        bottom: 24
      })
      expect(edgeFades({ ...view, scrollTop: 400 })).toEqual({ top: 24, bottom: 0 })
    })

    it('grows a fade with the distance scrolled, so it never snaps on', () => {
      const view = { clientHeight: 200, scrollHeight: 600 }
      expect(edgeFades({ ...view, scrollTop: 6 }).top).toBe(6)
      expect(edgeFades({ ...view, scrollTop: 390 }).bottom).toBe(10)
    })

    it('keeps a one-row list readable on a very short screen', () => {
      expect(
        edgeFades({ clientHeight: 50, scrollHeight: 442, scrollTop: 196 })
      ).toEqual({ top: 12.5, bottom: 12.5 })
    })

    it('does not fade a list that fits', () => {
      expect(
        edgeFades({ clientHeight: 200, scrollHeight: 200, scrollTop: 0 })
      ).toEqual({ top: 0, bottom: 0 })
    })

    it('ignores the overscroll bounce past either end', () => {
      const view = { clientHeight: 200, scrollHeight: 600 }
      expect(edgeFades({ ...view, scrollTop: -30 })).toEqual({
        top: 0,
        bottom: 24
      })
      expect(edgeFades({ ...view, scrollTop: 430 })).toEqual({
        top: 24,
        bottom: 0
      })
    })

    it('updates the fades as the list scrolls', () => {
      render(<MobileSetList {...props()} />)
      const list = screen.getByRole('list')
      size(list, 600, 200)
      list.scrollTop = 100
      fireEvent.scroll(list)
      expect(fade(list, 'top')).toBe('24px')
      expect(fade(list, 'bottom')).toBe('24px')
    })

    it('updates the fades when the set count changes', () => {
      const { rerender } = render(
        <MobileSetList {...props({ sets: [entry, entry] })} />
      )
      const list = screen.getByRole('list')
      expect(fade(list, 'bottom')).toBe('0px')
      size(list, 600, 200)
      rerender(<MobileSetList {...props({ sets: [entry, entry, entry] })} />)
      expect(fade(list, 'bottom')).toBe('24px')
    })

    it('masks the list and keeps a scrolled-to row clear of the fades', () => {
      render(<MobileSetList {...props()} />)
      const list = screen.getByRole('list')
      expect(list.style.maskImage).toContain('var(--fade-top')
      expect(list.style.maskImage).toContain('var(--fade-bottom')
      expect(list.classList).toContain('scroll-py-6')
    })
  })

  it('sizes the list so extra sets scroll instead of taking more space', () => {
    const entry = { reps: '', weight: '', notes: '' }
    const { rerender } = render(
      <MobileSetList {...props({ sets: [entry], selectedSet: 0 })} />
    )
    const style = () => screen.getByRole('list').style
    const oneRow = style().minHeight
    rerender(<MobileSetList {...props({ sets: Array(3).fill(entry) })} />)
    const threeRows = style().flexBasis
    rerender(<MobileSetList {...props({ sets: Array(20).fill(entry) })} />)
    expect(style().flexBasis).toBe(threeRows)
    expect(style().minHeight).toBe(oneRow)
  })

  it('lets a short list fill the spare room so the controls stay at the bottom', () => {
    const entry = { reps: '', weight: '', notes: '' }
    render(<MobileSetList {...props({ sets: [entry], selectedSet: 0 })} />)
    const list = screen.getByRole('list')
    expect(list.classList).toContain('grow')
    expect(list.style.maxHeight).toBe('')
  })

  it('scrolls a newly added set into view, but not when one is removed', () => {
    const entry = { reps: '', weight: '', notes: '' }
    const { rerender } = render(
      <MobileSetList {...props({ sets: [entry, entry] })} />
    )
    const list = screen.getByRole('list')
    Object.defineProperty(list, 'scrollHeight', { value: 900 })
    rerender(<MobileSetList {...props({ sets: [entry, entry, entry] })} />)
    expect(list.scrollTop).toBe(900)
    list.scrollTop = 40
    rerender(<MobileSetList {...props({ sets: [entry, entry] })} />)
    expect(list.scrollTop).toBe(40)
  })

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

  const highlight = () =>
    screen.getByRole('list').firstElementChild as HTMLElement

  it('marks only the selected set as current', () => {
    render(<MobileSetList {...props()} />)
    const selected = screen.getByRole('button', { name: /^Set 2/ })
    const other = screen.getByRole('button', { name: /^Set 1/ })
    expect(selected.getAttribute('aria-current')).toBe('true')
    expect(other.getAttribute('aria-current')).toBeNull()
  })

  it('draws the outline on one shared highlight, not on the rows', () => {
    render(<MobileSetList {...props()} />)
    expect(highlight().className).toContain('border-app-colors-300')
    expect(highlight().getAttribute('aria-hidden')).toBe('true')
    screen.getAllByRole('button', { name: /^Set / }).forEach((row) => {
      expect(row.className).not.toContain('border-app-colors-300')
    })
  })

  it('slides the highlight to the selected set using only transform', () => {
    const { rerender } = render(
      <MobileSetList {...props({ selectedSet: 0 })} />
    )
    const first = highlight().style.transform
    rerender(<MobileSetList {...props({ selectedSet: 1 })} />)
    expect(highlight().style.transform).not.toBe(first)
    expect(highlight().className).toContain('transition-[transform,opacity]')
    expect(highlight().style.top).toBe('')
  })

  it('fades the highlight out in place when no set is selected', () => {
    const { rerender } = render(<MobileSetList {...props()} />)
    const position = highlight().style.transform
    expect(highlight().className).not.toContain('opacity-0')
    rerender(<MobileSetList {...props({ selectedSet: null })} />)
    expect(highlight().className).toContain('opacity-0')
    expect(highlight().style.transform).toBe(position)
  })

  it('moves the highlight without sliding under reduced motion', () => {
    render(<MobileSetList {...props()} />)
    expect(highlight().className).toContain('motion-reduce:transition-none')
    expect(screen.getByRole('list').className).toContain('motion-safe:scroll-smooth')
  })

  it('outlines the selected set’s number in lime', () => {
    render(<MobileSetList {...props()} />)
    const number = screen.getByText('2')
    expect(number.className).toContain('border-app-colors-300')
    expect(number.className).toContain('text-app-colors-300')
    expect(number.className).not.toContain('bg-neutral-800')
  })

  it('leaves an unselected set’s number grey', () => {
    render(<MobileSetList {...props({ selectedSet: 0 })} />)
    const number = screen.getByText('2')
    expect(number.className).toContain('bg-neutral-800')
    expect(number.className).not.toContain('app-colors-300')
  })

  it('keeps the filled check on a selected logged set', () => {
    render(<MobileSetList {...props({ selectedSet: 0 })} />)
    const row = screen.getByRole('button', { name: /^Set 1/ })
    const badge = row.querySelector('svg')?.parentElement
    expect(badge?.className).toContain('bg-app-colors-300')
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

  it('gives clear set a visible button outline', () => {
    render(<MobileSetList {...props({ selectedSet: 0 })} />)
    const clear = screen.getByRole('button', { name: 'Clear set 1' })
    expect(clear.className).toContain('border-neutral-700')
  })

  it('hides the note field when no set is selected', () => {
    render(<MobileSetList {...props({ selectedSet: null })} />)
    expect(screen.queryByLabelText(/notes/)).toBeNull()
  })

  it('puts a remove button on every row, beside the row button', () => {
    const onSelect = vi.fn()
    const onRemoveSet = vi.fn()
    render(<MobileSetList {...props({ onSelect, onRemoveSet })} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    rows.forEach((row, index) => {
      const remove = within(row).getByRole('button', {
        name: `Remove set ${index + 1} from Bench Press`
      })
      const rowButton = within(row).getByRole('button', {
        name: new RegExp(`^Set ${index + 1}`)
      })
      expect(rowButton.contains(remove)).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: /Remove set 1/ }))
    expect(onRemoveSet).toHaveBeenCalledWith(0)
    expect(onSelect).not.toHaveBeenCalled()
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
    expect(onRemoveSet).toHaveBeenCalledWith(1)

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
