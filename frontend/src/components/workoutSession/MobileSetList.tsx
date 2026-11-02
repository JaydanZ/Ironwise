import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Exercise } from '@/types/programCreation'
import {
  PreviousExercise,
  SetEntry,
  WeightUnit
} from '@/types/workoutSession'
import {
  isSetComplete,
  MAX_SETS,
  MIN_SETS
} from '@/hooks/useWorkoutSession'
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
  onRemoveSet: () => void
  onNoteChange: (set: number, value: string) => void
}

const loggedText = (entry: SetEntry, unit: WeightUnit) =>
  entry.weight ? `${entry.weight} ${unit} × ${entry.reps}` : `${entry.reps} reps`

export const MobileSetList = ({
  exercise,
  sets,
  selectedSet,
  unit,
  previous,
  onSelect,
  onAddSet,
  onRemoveSet,
  onNoteChange
}: MobileSetListProps) => {
  const selectedRow = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedSet])

  return (
    <div className="mt-4">
      <ol className="flex flex-col gap-2">
        {sets.map((entry, index) => {
          const setNumber = index + 1
          const selected = index === selectedSet
          const complete = isSetComplete(entry)
          const text = complete
            ? loggedText(entry, unit)
            : (toPreviousValues(previousSetFor(previous, setNumber), unit)
                ?.text ?? `${exercise.reps} reps`)
          return (
            <li key={index}>
              <button
                ref={selected ? selectedRow : undefined}
                type="button"
                aria-current={selected ? 'true' : undefined}
                aria-label={`Set ${setNumber}, ${text}${complete ? ', logged' : ''}`}
                onClick={() => onSelect(index)}
                className={clsx(
                  'flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left outline-none transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-app-colors-300',
                  selected
                    ? 'border-app-colors-300 bg-neutral-900'
                    : 'border-neutral-800 bg-neutral-900/40'
                )}
              >
                <span
                  aria-hidden
                  className={clsx(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                    complete
                      ? 'bg-app-colors-300 text-app-colors-500'
                      : 'bg-neutral-800 text-neutral-400'
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
            </li>
          )
        })}
      </ol>

      <div className="flex items-center justify-end gap-2 pt-3">
        {sets.length > MIN_SETS && (
          <button
            type="button"
            onClick={onRemoveSet}
            aria-label={`Remove set ${sets.length} from ${exercise.name}`}
            title="Remove last set"
            className={clsx(
              setActionClass,
              'size-11 text-neutral-400 hover:bg-neutral-800/70 hover:text-red-300'
            )}
          >
            <Trash2 aria-hidden />
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
          placeholder="Add a note"
          value={sets[selectedSet].notes}
          onChange={(event) => onNoteChange(selectedSet, event.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-neutral-800 bg-neutral-900/70 px-3 text-base text-neutral-50 outline-none transition-[border-color,background-color] duration-150 ease-out placeholder:text-neutral-500 focus:border-app-colors-300/70 focus:bg-neutral-900"
        />
      )}

      {exercise.exercise_tip && (
        <p className="mt-4 text-sm leading-relaxed text-neutral-400">
          {exercise.exercise_tip}
        </p>
      )}
    </div>
  )
}
