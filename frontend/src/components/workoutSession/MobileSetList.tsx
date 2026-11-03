import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Exercise } from '@/types/programCreation'
import { PreviousExercise, SetEntry, WeightUnit } from '@/types/workoutSession'
import { isSetComplete, MAX_SETS, MIN_SETS } from '@/hooks/useWorkoutSession'
import { setActionClass } from './ExerciseItem'
import { previousSetFor, toPreviousValues } from './previousSets'

interface MobileSetListProps {
  exercise: Exercise
  sets: SetEntry[]
  selectedSet: number | null
  unit: WeightUnit
  previous?: PreviousExercise
  onSelect: (set: number) => void
  onAddSet: () => void
  onRemoveSet: (set: number) => void
  onNoteChange: (set: number, value: string) => void
  onClearSet: (set: number) => void
}

const loggedText = (entry: SetEntry, unit: WeightUnit) =>
  entry.weight
    ? `${entry.weight} ${unit} × ${entry.reps}`
    : `${entry.reps} reps`

const rowsHeight = (rows: number) =>
  `calc(${rows * 3 + (rows - 1) * 0.5}rem + 2px)`

const MAX_FADE_PX = 24

const EDGE_FADE_MASK =
  'linear-gradient(to bottom, transparent, #000 var(--fade-top, 0px), #000 calc(100% - var(--fade-bottom, 0px)), transparent)'

export const edgeFades = ({
  scrollTop,
  clientHeight,
  scrollHeight
}: {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
}) => {
  const maxFade = Math.min(MAX_FADE_PX, clientHeight / 4)
  const clampFade = (distance: number) =>
    Math.min(maxFade, Math.max(0, distance))
  return {
    top: clampFade(scrollTop),
    bottom: clampFade(scrollHeight - clientHeight - scrollTop)
  }
}

const updateEdgeFades = (list: HTMLElement) => {
  const { top, bottom } = edgeFades(list)
  list.style.setProperty('--fade-top', `${top}px`)
  list.style.setProperty('--fade-bottom', `${bottom}px`)
}

export const MobileSetList = ({
  exercise,
  sets,
  selectedSet,
  unit,
  previous,
  onSelect,
  onAddSet,
  onRemoveSet,
  onNoteChange,
  onClearSet
}: MobileSetListProps) => {
  const selectedRow = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLOListElement>(null)
  const previousSetCount = useRef(sets.length)
  const [highlightedSet, setHighlightedSet] = useState(selectedSet ?? 0)

  if (selectedSet !== null && selectedSet !== highlightedSet) {
    setHighlightedSet(selectedSet)
  }

  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedSet])

  useLayoutEffect(() => {
    if (list.current) updateEdgeFades(list.current)
  }, [sets.length])

  useEffect(() => {
    const element = list.current
    if (!element) return
    const observer = new ResizeObserver(() => updateEdgeFades(element))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (sets.length > previousSetCount.current && list.current)
      list.current.scrollTop = list.current.scrollHeight
    previousSetCount.current = sets.length
  }, [sets.length])

  return (
    <div className="contents">
      <ol
        ref={list}
        onScroll={(event) => updateEdgeFades(event.currentTarget)}
        style={{
          flexBasis: rowsHeight(Math.min(sets.length, 3)),
          minHeight: rowsHeight(1),
          maskImage: EDGE_FADE_MASK,
          WebkitMaskImage: EDGE_FADE_MASK
        }}
        className="relative mt-4 flex grow flex-col gap-2 overflow-y-auto overscroll-contain scroll-py-6 p-px [scrollbar-color:#404040_transparent] [scrollbar-width:thin] motion-safe:scroll-smooth"
      >
        <li
          aria-hidden
          style={{
            transform: `translateY(calc(${highlightedSet} * (100% + 0.5rem)))`
          }}
          className={clsx(
            'pointer-events-none absolute inset-x-px h-12 rounded-lg border border-app-colors-300 bg-neutral-900 transition-[transform,opacity] duration-[240ms] ease-in-out-strong will-change-transform motion-reduce:transition-none',
            selectedSet === null && 'opacity-0'
          )}
        />
        {sets.map((entry, index) => {
          const setNumber = index + 1
          const selected = index === selectedSet
          const complete = isSetComplete(entry)
          const canRemove = sets.length > MIN_SETS
          const text = complete
            ? loggedText(entry, unit)
            : toPreviousValues(previousSetFor(previous, setNumber), unit)
                ?.text ?? `${exercise.reps} reps`
          return (
            <li key={index} className="relative">
              <button
                ref={selected ? selectedRow : undefined}
                type="button"
                aria-current={selected ? 'true' : undefined}
                aria-label={`Set ${setNumber}, ${text}${
                  complete ? ', logged' : ''
                }`}
                onClick={() => onSelect(index)}
                className={clsx(
                  'flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left outline-none transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-app-colors-300',
                  canRemove && 'pr-12',
                  selected
                    ? 'border-transparent bg-transparent'
                    : 'border-neutral-800 bg-neutral-900/40'
                )}
              >
                <span
                  aria-hidden
                  className={clsx(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors duration-200',
                    complete
                      ? 'border-transparent bg-app-colors-300 text-app-colors-500'
                      : selected
                        ? 'border-app-colors-300 text-app-colors-300'
                        : 'border-transparent bg-neutral-800 text-neutral-400'
                  )}
                >
                  {complete ? (
                    <Check strokeWidth={3} className="size-3.5" />
                  ) : (
                    setNumber
                  )}
                </span>
                <span
                  className={clsx(
                    'min-w-0 flex-1 truncate text-[0.9375rem] tabular-nums',
                    complete ? 'text-neutral-50' : 'text-neutral-500'
                  )}
                >
                  {text}
                </span>
              </button>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onRemoveSet(index)}
                  aria-label={`Remove set ${setNumber} from ${exercise.name}`}
                  title={`Remove set ${setNumber}`}
                  className={clsx(
                    setActionClass,
                    'absolute inset-y-0 right-0.5 my-auto size-11 text-neutral-500 hover:text-red-300'
                  )}
                >
                  <Trash2 aria-hidden />
                </button>
              )}
            </li>
          )
        })}
      </ol>

      <div className="flex shrink-0 items-center justify-end gap-2 pt-3">
        {selectedSet !== null && isSetComplete(sets[selectedSet]) && (
          <button
            type="button"
            onClick={() => onClearSet(selectedSet)}
            className="mr-auto min-h-11 rounded-md border border-neutral-700 px-4 text-sm font-medium text-neutral-200 outline-none transition-[transform,color,border-color] duration-150 ease-out-strong hover:border-red-300/60 hover:text-red-300 focus-visible:ring-1 focus-visible:ring-app-colors-300 active:scale-[0.97]"
          >
            Clear set {selectedSet + 1}
          </button>
        )}
        <button
          type="button"
          onClick={onAddSet}
          disabled={sets.length >= MAX_SETS}
          aria-label={`Add a set to ${exercise.name}`}
          title="Add set"
          className={clsx(
            setActionClass,
            'size-11 border border-neutral-700 text-neutral-200 hover:border-app-colors-300/60 hover:text-app-colors-300'
          )}
        >
          <Plus aria-hidden />
        </button>
      </div>

      {selectedSet !== null && (
        <input
          type="text"
          autoComplete="off"
          maxLength={280}
          aria-label={`Set ${selectedSet + 1} notes`}
          placeholder={`Note for set ${selectedSet + 1}`}
          value={sets[selectedSet].notes}
          onChange={(event) => onNoteChange(selectedSet, event.target.value)}
          className="mt-2 h-11 w-full shrink-0 rounded-md border border-neutral-800 bg-neutral-900/70 px-3 text-base text-neutral-50 outline-none transition-[border-color,background-color] duration-150 ease-out placeholder:text-neutral-500 focus:border-app-colors-300/70 focus:bg-neutral-900"
        />
      )}
    </div>
  )
}
