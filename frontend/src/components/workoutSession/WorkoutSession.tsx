import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { ArrowLeft } from 'lucide-react'
import { Workout } from '@/types/programCreation'
import { SubmitWorkoutResponse, WeightUnit } from '@/types/workoutSession'
import {
  isExerciseComplete,
  useWorkoutSession
} from '@/hooks/useWorkoutSession'
import {
  useGetPreviousPerformanceQuery,
  useSubmitWorkoutMutation
} from '@/services/protectedRoutesAPI'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { panelClass, primaryButtonClass } from '../profile/profileStyles'
import { ExerciseItem } from './ExerciseItem'
import { SessionComplete } from './SessionComplete'
import { SessionSummary, summarizeSession } from './sessionSummary'

interface WorkoutSessionProps {
  programId: string
  programName: string
  workout: Workout
}

const ghostButtonClass =
  'h-10 border border-neutral-700 px-4 text-sm font-medium text-neutral-200 transition-[transform,background-color,color] duration-150 ease-out-strong hover:bg-neutral-800/70 hover:text-neutral-50 active:scale-[0.97] disabled:opacity-40'

const UNITS: WeightUnit[] = ['lb', 'kg']

const UnitToggle = ({
  unit,
  onChange
}: {
  unit: WeightUnit
  onChange: (unit: WeightUnit) => void
}) => (
  <div
    role="radiogroup"
    aria-label="Weight unit"
    className="inline-flex h-9 shrink-0 rounded-md border border-neutral-800 bg-neutral-900/70 p-0.5"
  >
    {UNITS.map((option) => {
      const selected = option === unit
      return (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(option)}
          className={clsx(
            'min-w-11 rounded-[5px] px-3 text-sm font-medium outline-none transition-[color,background-color,transform] duration-150 ease-out focus-visible:ring-1 focus-visible:ring-app-colors-300 active:scale-[0.97]',
            selected
              ? 'bg-neutral-700/80 text-neutral-50'
              : 'text-neutral-400 hover:text-neutral-200'
          )}
        >
          {option}
        </button>
      )
    })}
  </div>
)

const getErrorMessage = (error: unknown): string => {
  const status = (error as { status?: number | string })?.status
  if (status === 422)
    return 'Your device date looks wrong. Check it, then try again.'
  if (status === 404) return 'This program no longer exists.'
  return 'Couldn’t save your workout. Your sets are kept; try again.'
}

export const WorkoutSession = ({
  programId,
  programName,
  workout
}: WorkoutSessionProps) => {
  const {
    state,
    performedOn,
    progress,
    updateSet,
    fillSet,
    addSet,
    removeSet,
    setUnit,
    getSubmission,
    clearDraft
  } = useWorkoutSession({ programId, workout })

  const exerciseNames = useMemo(
    () => Array.from(new Set(workout.exercises.map((e) => e.name))),
    [workout.exercises]
  )
  const previousQuery = useGetPreviousPerformanceQuery(
    { names: exerciseNames, until: performedOn },
    { skip: exerciseNames.length === 0 }
  )
  const [submitWorkout, submitState] = useSubmitWorkoutMutation()

  const [openItem, setOpenItem] = useState(() => {
    const index = state.entries.findIndex((sets) => !isExerciseComplete(sets))
    return String(index === -1 ? 0 : index)
  })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [completed, setCompleted] = useState<{
    result: SubmitWorkoutResponse
    summary: SessionSummary
  } | null>(null)

  const handleSubmit = async (isCompleted: boolean) => {
    try {
      const submission = getSubmission(isCompleted)
      const response = await submitWorkout(submission).unwrap()
      clearDraft()
      setConfirmOpen(false)
      setCompleted({
        result: response,
        summary: summarizeSession(workout, submission, state.unit)
      })
      window.scrollTo({ top: 0 })
    } catch (error) {
      console.error(error)
      setConfirmOpen(false)
    }
  }

  if (completed)
    return (
      <SessionComplete
        result={completed.result}
        summary={completed.summary}
        workout={workout}
        programName={programName}
        performedOn={performedOn}
      />
    )

  const isSubmitting = submitState.isLoading
  const setsLeft = progress.totalSets - progress.completedSets

  return (
    <>
      <header className="pb-6">
        <Link
          to="/training"
          className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-neutral-400 outline-none transition-colors duration-150 hover:text-neutral-50 focus-visible:ring-1 focus-visible:ring-app-colors-300"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Training
        </Link>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold leading-none text-neutral-50 sm:text-4xl">
              {workout.day}
            </h1>
            <p className="mt-2 text-sm font-medium text-app-colors-300">
              {workout.focus}
            </p>
            <p className="mt-1 truncate text-sm text-neutral-400">
              {programName}
            </p>
          </div>
          <UnitToggle unit={state.unit} onChange={setUnit} />
        </div>
      </header>

      <section
        aria-labelledby="exercises-title"
        className={clsx(panelClass, 'mb-24 min-[800px]:mb-0')}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-neutral-800 px-4 py-4 sm:px-6">
          <h2
            id="exercises-title"
            className="text-base font-semibold text-neutral-50"
          >
            Exercises
          </h2>
          <p
            className="text-sm tabular-nums text-neutral-400"
            aria-live="polite"
          >
            {progress.completedExercises} of {progress.totalExercises} done
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          value={openItem}
          onValueChange={setOpenItem}
        >
          {workout.exercises.map((exercise, index) => (
            <ExerciseItem
              key={`${exercise.name}-${index}`}
              exercise={exercise}
              exerciseIndex={index}
              sets={state.entries[index]}
              unit={state.unit}
              previous={previousQuery.data?.[exercise.name]}
              previousLoading={previousQuery.isLoading}
              onChange={updateSet}
              onFill={fillSet}
              onAddSet={addSet}
              onRemoveSet={removeSet}
            />
          ))}
        </Accordion>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(61px+max(env(safe-area-inset-bottom),0.5rem))] z-40 border-t border-neutral-800/80 bg-app-colors-500/95 px-4 py-3 supports-[backdrop-filter]:bg-app-colors-500/80 supports-[backdrop-filter]:backdrop-blur-xl min-[800px]:sticky min-[800px]:bottom-6 min-[800px]:mt-6 min-[800px]:rounded-lg min-[800px]:border min-[800px]:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          {submitState.isError && (
            <p role="alert" className="text-sm text-red-400">
              {getErrorMessage(submitState.error)}
            </p>
          )}
          <div className="flex items-center gap-3">
            <p className="hidden flex-1 text-sm tabular-nums text-neutral-400 sm:block">
              {progress.allComplete
                ? 'Every set logged'
                : `${setsLeft} ${setsLeft === 1 ? 'set' : 'sets'} left`}
            </p>
            {!progress.allComplete && (
              <Button
                variant="ghost"
                className={ghostButtonClass}
                disabled={progress.completedSets === 0 || isSubmitting}
                onClick={() => setConfirmOpen(true)}
              >
                Finish early
              </Button>
            )}
            <Button
              className={clsx(primaryButtonClass, 'flex-1 sm:flex-none')}
              disabled={!progress.allComplete || isSubmitting}
              onClick={() => handleSubmit(true)}
            >
              {isSubmitting ? 'Saving...' : 'Submit workout'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg border-neutral-800 bg-[#141414]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-neutral-50">
              Finish with {progress.completedSets} of {progress.totalSets} sets?
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Only the sets you logged are saved. Skipped sets won&rsquo;t show
              up as your previous numbers next time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <DialogClose asChild>
              <Button
                variant="ghost"
                className="h-10 text-neutral-300 hover:bg-neutral-800/70 hover:text-neutral-50"
              >
                Keep going
              </Button>
            </DialogClose>
            <Button
              className={primaryButtonClass}
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
            >
              {isSubmitting ? 'Saving...' : 'Save and finish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
