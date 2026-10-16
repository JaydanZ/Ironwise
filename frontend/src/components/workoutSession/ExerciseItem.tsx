import { memo } from 'react'
import clsx from 'clsx'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Exercise } from '@/types/programCreation'
import { PreviousExercise, SetEntry, WeightUnit } from '@/types/workoutSession'
import {
  isExerciseComplete,
  isSetComplete,
  localDateString,
  MAX_SETS,
  MIN_SETS
} from '@/hooks/useWorkoutSession'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { SetRow, setGridClass } from './SetRow'
import {
  bestPreviousSet,
  previousSetFor,
  toPreviousValues
} from './previousSets'

interface ExerciseItemProps {
  exercise: Exercise
  exerciseIndex: number
  sets: SetEntry[]
  unit: WeightUnit
  previous?: PreviousExercise
  previousLoading: boolean
  onChange: (
    exercise: number,
    set: number,
    field: keyof SetEntry,
    value: string
  ) => void
  onFill: (exercise: number, set: number, reps: string, weight: string) => void
  onAddSet: (exercise: number) => void
  onRemoveSet: (exercise: number) => void
}

const setActionClass =
  'inline-flex size-10 items-center justify-center rounded-md outline-none transition-[transform,color,background-color,border-color] duration-150 ease-out-strong focus-visible:ring-1 focus-visible:ring-app-colors-300 active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[1.125rem]'

const formatSessionDate = (dateStr: string) => {
  if (dateStr === localDateString()) return 'today'
  const date = new Date(`${dateStr}T00:00:00`)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const ExerciseItem = memo(
  ({
    exercise,
    exerciseIndex,
    sets,
    unit,
    previous,
    previousLoading,
    onChange,
    onFill,
    onAddSet,
    onRemoveSet
  }: ExerciseItemProps) => {
    const complete = isExerciseComplete(sets)
    const loggedCount = sets.filter(isSetComplete).length
    const lastBest = toPreviousValues(bestPreviousSet(previous), unit)

    return (
      <AccordionItem
        value={String(exerciseIndex)}
        className="border-b-0 border-t border-neutral-800 first:border-t-0"
      >
        <AccordionTrigger className="group min-h-16 gap-3 px-4 py-3 outline-none transition-colors hover:no-underline focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-app-colors-300 sm:px-6 [&>svg]:size-[1.125rem] [&>svg]:text-neutral-500 [&[data-state=open]>svg]:text-app-colors-300">
          <span
            aria-hidden
            className={clsx(
              'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors duration-150',
              complete
                ? 'border-app-colors-300 bg-app-colors-300 text-app-colors-500'
                : 'border-neutral-700 text-neutral-400 group-data-[state=open]:border-app-colors-300 group-data-[state=open]:text-app-colors-300'
            )}
          >
            {complete ? (
              <Check
                strokeWidth={3}
                className="size-3.5 duration-150 animate-in fade-in zoom-in-90 motion-reduce:animate-none"
              />
            ) : (
              exerciseIndex + 1
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-medium leading-snug text-neutral-50">
              {exercise.name}
            </span>
            <span className="mt-0.5 block truncate text-sm tabular-nums text-neutral-400">
              {exercise.sets} &times; {exercise.reps}
              {lastBest && (
                <>
                  <span aria-hidden className="px-1.5 text-neutral-600">
                    /
                  </span>
                  <span className="text-neutral-300">
                    <span className="sr-only">, </span>Last {lastBest.text}
                  </span>
                </>
              )}
              <span className="sr-only">
                {complete
                  ? ', complete'
                  : `, ${loggedCount} of ${sets.length} sets logged`}
              </span>
            </span>
          </span>
          <span
            aria-hidden
            className={clsx(
              'shrink-0 text-sm font-medium tabular-nums',
              complete ? 'text-app-colors-300' : 'text-neutral-500'
            )}
          >
            {loggedCount}/{sets.length}
          </span>
        </AccordionTrigger>

        <AccordionContent className="px-4 pb-4 sm:px-6">
          <div
            aria-hidden
            className={clsx(
              setGridClass,
              'border-b border-neutral-800 pb-2 text-xs font-medium text-neutral-500'
            )}
          >
            <span>Set</span>
            <span className="truncate">
              Previous
              {previous?.date && (
                <span className="font-normal text-neutral-600">
                  {' '}
                  ({formatSessionDate(previous.date)})
                </span>
              )}
            </span>
            <span className="text-center">Reps</span>
            <span className="text-center">Weight</span>
          </div>

          <ol>
            {sets.map((entry, setIndex) => (
              <SetRow
                key={setIndex}
                exerciseIndex={exerciseIndex}
                setIndex={setIndex}
                exerciseName={exercise.name}
                entry={entry}
                targetReps={exercise.reps}
                unit={unit}
                previous={previousSetFor(previous, setIndex + 1)}
                previousLoading={previousLoading}
                onChange={onChange}
                onFill={onFill}
              />
            ))}
          </ol>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-3">
            {sets.length > MIN_SETS && (
              <button
                type="button"
                onClick={() => onRemoveSet(exerciseIndex)}
                disabled={sets.length <= MIN_SETS}
                aria-label={`Remove set ${sets.length} from ${exercise.name}`}
                title="Remove last set"
                className={clsx(
                  setActionClass,
                  'text-neutral-400 hover:bg-neutral-800/70 hover:text-red-300'
                )}
              >
                <Trash2 aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => onAddSet(exerciseIndex)}
              disabled={sets.length >= MAX_SETS}
              aria-label={`Add a set to ${exercise.name}`}
              title="Add set"
              className={clsx(
                setActionClass,
                'border border-neutral-700 text-neutral-200 hover:border-app-colors-300/60 hover:text-app-colors-300'
              )}
            >
              <Plus aria-hidden />
            </button>
          </div>

          {exercise.exercise_tip && (
            <p className="mt-3 max-w-prose border-t border-neutral-800 pt-3 text-sm leading-relaxed text-neutral-400">
              {exercise.exercise_tip}
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    )
  }
)

ExerciseItem.displayName = 'ExerciseItem'
