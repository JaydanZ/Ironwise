import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Workout } from '@/types/programCreation'
import {
  PreviousPerformance,
  SetEntry,
  WeightUnit
} from '@/types/workoutSession'
import { ExerciseImage } from './ExerciseImage'
import { ExerciseSwitcher } from './ExerciseSwitcher'
import { MobileSetList } from './MobileSetList'
import { previousSetFor, toPreviousValues } from './previousSets'
import {
  clampWeight,
  exerciseAfterDone,
  firstIncompleteExercise,
  nextExerciseIndex,
  PanelValues,
  seedValues,
  selectedSetIndex
} from './sessionNavigation'
import { SetLogPanel } from './SetLogPanel'

interface MobileSessionProps {
  workout: Workout
  entries: SetEntry[][]
  unit: WeightUnit
  previous?: PreviousPerformance
  allComplete: boolean
  completedSets: number
  isSubmitting: boolean
  errorMessage: string | null
  onFill: (exercise: number, set: number, reps: string, weight: string) => void
  onUpdateSet: (
    exercise: number,
    set: number,
    field: keyof SetEntry,
    value: string
  ) => void
  onAddSet: (exercise: number) => void
  onRemoveSet: (exercise: number) => void
  onUnitChange: (unit: WeightUnit) => void
  onFinishEarly: () => void
  onSubmit: () => void
}

export const MobileSession = ({
  workout,
  entries,
  unit,
  previous,
  allComplete,
  completedSets,
  isSubmitting,
  errorMessage,
  onFill,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onUnitChange,
  onFinishEarly,
  onSubmit
}: MobileSessionProps) => {
  const [exerciseIndex, setExerciseIndex] = useState(() =>
    firstIncompleteExercise(entries)
  )
  const [setOverride, setSetOverride] = useState<number | null>(null)

  useEffect(() => {
    document.body.setAttribute('data-workout-session', '')
    return () => document.body.removeAttribute('data-workout-session')
  }, [])

  const exercise = workout.exercises[exerciseIndex]
  const sets = entries[exerciseIndex]
  const previousExercise = previous?.[exercise.name]
  const setIndex = selectedSetIndex(sets, setOverride)
  const showSubmit = allComplete && setOverride === null

  const jumpTo = (index: number) => {
    setExerciseIndex(index)
    setSetOverride(null)
  }

  const handleDone = ({ weight, reps }: PanelValues) => {
    const nextExercise = exerciseAfterDone(
      entries,
      exerciseIndex,
      setIndex,
      reps
    )
    onFill(exerciseIndex, setIndex, reps, clampWeight(weight))
    jumpTo(nextExercise)
  }

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex h-[100dvh] flex-col bg-app-colors-500">
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-2 border-b border-neutral-800 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <Link
          to="/training"
          aria-label="Back to training"
          className="-ml-2 inline-flex size-11 items-center justify-center rounded-md text-neutral-400 outline-none transition-colors duration-150 hover:text-neutral-50 focus-visible:ring-1 focus-visible:ring-app-colors-300"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="line-clamp-2 text-center font-display text-lg font-bold leading-tight text-neutral-50">
          {exercise.name}
        </h1>
        <ExerciseSwitcher
          exercises={workout.exercises}
          entries={entries}
          currentIndex={exerciseIndex}
          nextIndex={nextExerciseIndex(entries, exerciseIndex)}
          onSelect={jumpTo}
        />
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {showSubmit
          ? 'Every set logged'
          : `${exercise.name}, set ${setIndex + 1} of ${sets.length}`}
      </p>

      <div
        key={exerciseIndex}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 duration-200 animate-in fade-in slide-in-from-right-4 motion-reduce:animate-none"
      >
        <ExerciseImage name={exercise.name} />
        <MobileSetList
          exercise={exercise}
          sets={sets}
          selectedSet={showSubmit ? null : setIndex}
          unit={unit}
          previous={previousExercise}
          onSelect={setSetOverride}
          onAddSet={() => onAddSet(exerciseIndex)}
          onRemoveSet={() => onRemoveSet(exerciseIndex)}
          onNoteChange={(set, value) =>
            onUpdateSet(exerciseIndex, set, 'notes', value)
          }
        />
      </div>

      <SetLogPanel
        key={`${exerciseIndex}:${setIndex}:${unit}`}
        setNumber={setIndex + 1}
        totalSets={sets.length}
        seed={seedValues({
          sets,
          setIndex,
          targetReps: exercise.reps,
          previous: previousExercise,
          unit
        })}
        unit={unit}
        lastText={
          toPreviousValues(
            previousSetFor(previousExercise, setIndex + 1),
            unit
          )?.text ?? null
        }
        showSubmit={showSubmit}
        showFinishEarly={!allComplete}
        canFinishEarly={completedSets > 0}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onUnitChange={onUnitChange}
        onFinishEarly={onFinishEarly}
        onDone={handleDone}
        onSubmit={onSubmit}
      />
    </div>
  )
}
