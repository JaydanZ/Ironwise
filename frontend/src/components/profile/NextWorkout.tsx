import { useId, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { ChevronDown, Play } from 'lucide-react'
import { Exercise, Workout, WorkoutProgram } from '@/types/programCreation'
import { Button } from '../ui/button'
import { CreateProgramButton } from '../programCreation/CreateProgramButton'
import {
  panelClass,
  panelHeaderClass,
  panelTitleClass,
  primaryButtonClass,
  skeletonClass
} from './profileStyles'
import { getDayIndex } from './schedule'

interface NextWorkoutProps {
  program: WorkoutProgram | null
  isLoading?: boolean
}

// Today's workout if scheduled, otherwise the next upcoming day in the week
const resolveWorkout = (structure: Workout[]): Workout | null => {
  if (!structure?.length) return null

  const todayIndex = new Date().getDay()

  const todayMatch = structure.find(
    (workout) => getDayIndex(workout.day) === todayIndex
  )
  if (todayMatch) return todayMatch

  let best: Workout | null = null
  let bestDiff = Infinity
  for (const workout of structure) {
    const dayIndex = getDayIndex(workout.day)
    if (dayIndex === null) continue
    const diff = (dayIndex - todayIndex + 7) % 7
    if (diff >= 1 && diff < bestDiff) {
      bestDiff = diff
      best = workout
    }
  }

  return best
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const NextWorkoutSkeleton = () => (
  <section className={panelClass} aria-busy="true" aria-label="Next workout">
    <div className={panelHeaderClass}>
      <div className="flex h-6 items-center">
        <div className={clsx(skeletonClass, 'h-5 w-28')} />
      </div>
      <div className={clsx(skeletonClass, 'h-6 w-16 rounded-full')} />
    </div>
    <div className="px-4 pb-2 pt-5 sm:px-6">
      <div className={clsx(skeletonClass, 'h-[1.875rem] w-40')} />
      <div className="mt-2 flex h-5 items-center">
        <div className={clsx(skeletonClass, 'h-4 w-24')} />
      </div>
      <div className="mt-1 flex h-5 items-center">
        <div className={clsx(skeletonClass, 'h-4 w-56 max-w-full')} />
      </div>
      <div className={clsx(skeletonClass, 'mt-5 h-10 w-36 rounded-md')} />
    </div>
    <ul aria-hidden className="px-4 pb-3 sm:px-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <li
          key={index}
          className="flex min-h-12 items-center justify-between gap-4 border-t border-neutral-800/80 first:border-t-0"
        >
          <div className={clsx(skeletonClass, 'h-4 w-1/2')} />
          <div className={clsx(skeletonClass, 'h-4 w-12')} />
        </li>
      ))}
    </ul>
  </section>
)

const MAX_FULL_LIST = 5
const COLLAPSED_ROWS = 4
const PREVIEW_HEIGHT = '3rem'
const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const

const ExerciseRow = ({ exercise }: { exercise: Exercise }) => (
  <li className="flex min-h-12 items-center gap-3 border-t border-neutral-800/80 py-3">
    <span className="flex-1 text-[0.9375rem] leading-snug text-neutral-100">
      {exercise.name}
    </span>
    <span className="whitespace-nowrap text-sm tabular-nums text-neutral-400">
      {exercise.sets} &times; {exercise.reps}
    </span>
  </li>
)

const ExerciseList = ({ exercises }: { exercises: Exercise[] }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const extraListId = useId()

  const isCollapsible = exercises.length > MAX_FULL_LIST
  const shown = isCollapsible ? exercises.slice(0, COLLAPSED_ROWS) : exercises
  const extra = isCollapsible ? exercises.slice(COLLAPSED_ROWS) : []
  const transition = {
    duration: prefersReducedMotion ? 0 : 0.25,
    ease: EASE_OUT_STRONG
  }

  return (
    <div className="px-4 pb-3 sm:px-6">
      <ul className="[&>li:first-child]:border-t-0">
        {shown.map((exercise, index) => (
          <ExerciseRow key={`${exercise.name}-${index}`} exercise={exercise} />
        ))}
      </ul>

      {isCollapsible && (
        <>
          <motion.div
            className="relative overflow-hidden"
            initial={false}
            animate={{ height: isExpanded ? 'auto' : PREVIEW_HEIGHT }}
            transition={transition}
            aria-hidden={!isExpanded}
          >
            <ul id={extraListId}>
              {extra.map((exercise, index) => (
                <ExerciseRow
                  key={`${exercise.name}-${index + COLLAPSED_ROWS}`}
                  exercise={exercise}
                />
              ))}
            </ul>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-[#141414]"
              initial={false}
              animate={{ opacity: isExpanded ? 0 : 1 }}
              transition={transition}
            />
          </motion.div>

          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={extraListId}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="group -ml-2 mt-1 inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-app-colors-300 outline-none transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-neutral-800/70 focus-visible:ring-1 focus-visible:ring-app-colors-300 [&_svg]:size-4"
          >
            {isExpanded ? 'Show less' : 'Show more'}
            <ChevronDown
              aria-hidden
              className={clsx(
                'transition-transform duration-200 ease-out-strong motion-reduce:transition-none',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
        </>
      )}
    </div>
  )
}

export const NextWorkout = ({ program, isLoading }: NextWorkoutProps) => {
  const navigate = useNavigate()
  const workout = useMemo(
    () => resolveWorkout(program?.program_structure ?? []),
    [program]
  )

  if (isLoading) return <NextWorkoutSkeleton />

  if (!program || !workout) {
    return (
      <section aria-labelledby="next-workout-title" className={panelClass}>
        <div className={panelHeaderClass}>
          <h2 id="next-workout-title" className={panelTitleClass}>
            Next workout
          </h2>
        </div>
        <div className="flex flex-col items-start gap-5 px-4 py-8 sm:px-6">
          <div>
            <p className="text-lg font-semibold text-neutral-50">
              No active program yet
            </p>
            <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-neutral-400">
              Set one of your saved programs as active, or create a new one, and
              your next training day will show up here.
            </p>
          </div>
          <CreateProgramButton className={primaryButtonClass} />
        </div>
      </section>
    )
  }

  const isToday = getDayIndex(workout.day) === new Date().getDay()

  return (
    <section aria-labelledby="next-workout-title" className={panelClass}>
      <div className={panelHeaderClass}>
        <h2 id="next-workout-title" className={panelTitleClass}>
          Next workout
        </h2>
        <span
          className={clsx(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            isToday
              ? 'bg-app-colors-300/15 text-app-colors-300'
              : 'bg-neutral-800 text-neutral-300'
          )}
        >
          {isToday ? 'Today' : 'Coming up'}
        </span>
      </div>

      <div className="px-4 pb-2 pt-5 sm:px-6">
        <p className="font-display text-3xl font-bold leading-none text-neutral-50">
          {workout.day}
        </p>
        <p className="mt-2 text-sm text-app-colors-300">{workout.focus}</p>
        <p className="mt-1 text-sm text-neutral-400">
          {program.program_name}
          {program.updated_at && (
            <>, updated {formatDate(program.updated_at)}</>
          )}
        </p>
        <Button
          className={clsx(primaryButtonClass, 'mt-5')}
          onClick={() =>
            navigate({
              to: '/workout',
              search: { programId: program.id, day: workout.day }
            })
          }
        >
          {isToday ? 'Start workout' : 'Start early'}
          <Play aria-hidden className="fill-current" />
        </Button>
      </div>

      <ExerciseList
        key={`${program.id}-${workout.day}`}
        exercises={workout.exercises}
      />
    </section>
  )
}
