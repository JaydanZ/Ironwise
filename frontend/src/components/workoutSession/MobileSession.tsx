import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { ArrowLeft } from 'lucide-react'
import {
  motion,
  PanInfo,
  useDragControls,
  useReducedMotion
} from 'motion/react'
import { Workout } from '@/types/programCreation'
import {
  PreviousPerformance,
  SetEntry,
  WeightUnit
} from '@/types/workoutSession'
import { toast } from '@/hooks/use-toast'
import { useHideSiteNav } from '@/hooks/useHideSiteNav'
import { ToastAction } from '@/components/ui/toast'
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
  selectedSetIndex,
  startsInSwipeArea,
  swipeTarget
} from './sessionNavigation'
import { SetLogPanel } from './SetLogPanel'
import {
  sessionBackLinkClass,
  sessionBodyClass,
  sessionFrameClass,
  sessionHeaderClass
} from './sessionStyles'

const DOUBLE_TAP_MS = 400

interface MobileSessionProps {
  workout: Workout
  entries: SetEntry[][]
  units: WeightUnit[]
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
  onRemoveSet: (exercise: number, set: number) => void
  onRestoreSet: (exercise: number, set: number, entry: SetEntry) => void
  onUnitChange: (exercise: number, unit: WeightUnit) => void
  onFinishEarly: () => void
  onSubmit: () => void
}

export const MobileSession = ({
  workout,
  entries,
  units,
  previous,
  allComplete,
  completedSets,
  isSubmitting,
  errorMessage,
  onFill,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRestoreSet,
  onUnitChange,
  onFinishEarly,
  onSubmit
}: MobileSessionProps) => {
  const [position, setPosition] = useState(() => ({
    exerciseIndex: firstIncompleteExercise(entries),
    enterFrom: 'right' as 'left' | 'right'
  }))
  const { exerciseIndex, enterFrom } = position
  const [setOverride, setSetOverride] = useState<number | null>(null)
  const [removedSets, setRemovedSets] = useState(0)
  const lastDoneAt = useRef(0)
  const dismissUndo = useRef<(() => void) | null>(null)
  const didSwipe = useRef(false)
  const prefersReducedMotion = useReducedMotion()
  const dragControls = useDragControls()

  useHideSiteNav()

  // An undo after leaving or submitting would write a stale draft back
  useEffect(() => () => dismissUndo.current?.(), [])

  const exercise = workout.exercises[exerciseIndex]
  const sets = entries[exerciseIndex]
  const unit = units[exerciseIndex]
  const previousExercise = previous?.[exercise.name]
  const setIndex = selectedSetIndex(sets, setOverride)
  const editingSet = setOverride !== null && setOverride < sets.length
  const showSubmit = allComplete && !editingSet
  const isDoubleTap = () => Date.now() - lastDoneAt.current < DOUBLE_TAP_MS

  const jumpTo = (index: number) => {
    // Functional so an undo toast from an earlier render compares the live index
    setPosition((current) => ({
      exerciseIndex: index,
      enterFrom: index < current.exerciseIndex ? 'left' : 'right'
    }))
    setSetOverride(null)
  }

  const handleSwipeEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    const target = swipeTarget(exerciseIndex, workout.exercises.length, {
      offset,
      velocity,
      width: window.innerWidth
    })
    if (target !== null) jumpTo(target)
  }

  const swipeElastic = (hasExerciseThatWay: boolean) =>
    hasExerciseThatWay && !prefersReducedMotion ? 1 : 0

  const handleRemoveSet = (set: number) => {
    onRemoveSet(exerciseIndex, set)
    setSetOverride((current) => {
      if (current === null || current < set) return current
      return current === set ? null : current - 1
    })
    setRemovedSets((count) => count + 1)
    const entry = sets[set]
    const removedFrom = exerciseIndex
    let restored = false
    const { dismiss } = toast({
      title: `Set ${set + 1} removed`,
      className: 'border-neutral-800 bg-[#141414] font-inter text-neutral-50',
      action: (
        <ToastAction
          altText={`Undo removing set ${set + 1}`}
          onClick={() => {
            if (restored) return
            restored = true
            onRestoreSet(removedFrom, set, entry)
            jumpTo(removedFrom)
            setRemovedSets((count) => count + 1)
          }}
          className="h-10 border-neutral-700 px-4 text-app-colors-300 hover:bg-neutral-800/70"
        >
          Undo
        </ToastAction>
      )
    })
    dismissUndo.current = dismiss
  }

  const handleDone = ({ weight, reps }: PanelValues) => {
    if (isDoubleTap()) return
    lastDoneAt.current = Date.now()
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
    <div className={clsx(sessionFrameClass, 'overflow-hidden')}>
      <header className={sessionHeaderClass}>
        <Link
          to="/training"
          aria-label="Back to training"
          className={sessionBackLinkClass}
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="line-clamp-2 text-center text-lg font-bold leading-tight text-neutral-50">
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

      <motion.div
        key={exerciseIndex}
        drag={workout.exercises.length > 1 ? 'x' : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{
          left: swipeElastic(exerciseIndex < workout.exercises.length - 1),
          right: swipeElastic(exerciseIndex > 0)
        }}
        onPointerDownCapture={(event) => {
          didSwipe.current = false
          const startsSwipe =
            event.pointerType !== 'mouse' &&
            !(event.target instanceof HTMLInputElement) &&
            startsInSwipeArea(event.clientX, window.innerWidth)
          if (startsSwipe) dragControls.start(event)
        }}
        onDragStart={() => {
          didSwipe.current = true
        }}
        onDragEnd={handleSwipeEnd}
        onClickCapture={(event) => {
          if (didSwipe.current) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        className={clsx(
          sessionBodyClass,
          'touch-pan-y duration-200 animate-in fade-in motion-reduce:animate-none',
          enterFrom === 'left'
            ? 'slide-in-from-left-4'
            : 'slide-in-from-right-4'
        )}
      >
        <ExerciseImage name={exercise.name} />
        {exercise.exercise_tip && (
          <p className="mt-3 shrink-0 text-sm leading-relaxed text-neutral-400">
            {exercise.exercise_tip}
          </p>
        )}
        <MobileSetList
          exercise={exercise}
          sets={sets}
          selectedSet={showSubmit ? null : setIndex}
          unit={unit}
          previous={previousExercise}
          onSelect={setSetOverride}
          onAddSet={() => onAddSet(exerciseIndex)}
          onRemoveSet={handleRemoveSet}
          onNoteChange={(set, value) =>
            onUpdateSet(exerciseIndex, set, 'notes', value)
          }
          onClearSet={(set) => onFill(exerciseIndex, set, '', '')}
        />
      </motion.div>

      <SetLogPanel
        // Removing a set can put a different set at the same position
        resetKey={`${exerciseIndex}:${setIndex}:${unit}:${removedSets}`}
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
          toPreviousValues(previousSetFor(previousExercise, setIndex + 1), unit)
            ?.text ?? null
        }
        showSubmit={showSubmit}
        showFinishEarly={!allComplete}
        canFinishEarly={completedSets > 0}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onUnitChange={(next) => onUnitChange(exerciseIndex, next)}
        onFinishEarly={onFinishEarly}
        onDone={handleDone}
        onSubmit={() => {
          if (!isDoubleTap()) onSubmit()
        }}
      />
    </div>
  )
}
