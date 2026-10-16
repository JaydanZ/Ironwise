import { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { Play, X } from 'lucide-react'
import { Button } from '../ui/button'
import { iconButtonClass, primaryButtonClass } from '../profile/profileStyles'
import { DAY_NAMES } from '../profile/schedule'
import { WeekDay, WeekDayStatus } from './weekPlan'

interface WorkoutDayDialogProps {
  day: WeekDay
  programId?: string
  children: ReactNode
}

const STATUS_BADGE: Record<
  Exclude<WeekDayStatus, 'rest'>,
  { label: string; className: string }
> = {
  done: {
    label: 'Done',
    className: 'bg-app-colors-300/15 text-app-colors-300'
  },
  today: {
    label: 'Today',
    className: 'bg-app-colors-300/15 text-app-colors-300'
  },
  planned: { label: 'Coming up', className: 'bg-neutral-800 text-neutral-300' },
  missed: { label: 'Missed', className: 'bg-neutral-800 text-neutral-400' }
}

const formatDate = (key: string): string => {
  const [year, month, date] = key.split('-').map(Number)
  return new Date(year, month - 1, date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export const WorkoutDayDialog = ({
  day,
  programId,
  children
}: WorkoutDayDialogProps) => {
  const navigate = useNavigate()
  const workout = day.workout
  if (!workout) return <>{children}</>

  const badge = day.status === 'rest' ? null : STATUS_BADGE[day.status]
  const count = workout.exercises.length

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in motion-reduce:animate-none" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="pointer-events-auto flex max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-lg border border-neutral-800 bg-[#141414] shadow-xl shadow-black/50 outline-none will-change-transform data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in motion-reduce:animate-none"
          >
            <div className="flex items-start gap-3 border-b border-neutral-800 py-4 pl-4 pr-2 sm:pl-6">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-400">
                  <span>
                    {DAY_NAMES[day.dayIndex]}, {formatDate(day.date)}
                  </span>
                  {badge && (
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  )}
                </p>
                <DialogPrimitive.Title className="mt-1.5 font-display text-2xl font-bold leading-tight text-neutral-50">
                  {workout.focus}
                </DialogPrimitive.Title>
                <p className="mt-1 text-sm tabular-nums text-neutral-400">
                  {count} {count === 1 ? 'exercise' : 'exercises'}
                </p>
              </div>
              <DialogPrimitive.Close
                aria-label="Close"
                className={clsx(iconButtonClass, '-mt-1 shrink-0')}
              >
                <X aria-hidden />
              </DialogPrimitive.Close>
            </div>

            {count ? (
              <ol className="overflow-y-auto overscroll-contain px-4 pb-2 sm:px-6">
                {workout.exercises.map((exercise, index) => (
                  <li
                    key={`${exercise.name}-${index}`}
                    className="flex min-h-12 items-start gap-3 border-t border-neutral-800/80 py-3 first:border-t-0"
                  >
                    <span className="w-5 shrink-0 pt-px text-sm tabular-nums text-neutral-500">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9375rem] leading-snug text-neutral-100">
                        {exercise.name}
                      </span>
                      {exercise.exercise_tip && (
                        <span className="mt-1 block text-[0.8125rem] leading-relaxed text-neutral-400">
                          {exercise.exercise_tip}
                        </span>
                      )}
                    </span>
                    <span className="whitespace-nowrap pt-px text-sm tabular-nums text-neutral-400">
                      {exercise.sets} &times; {exercise.reps}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-4 py-6 text-sm text-neutral-400 sm:px-6">
                No exercises listed for this day.
              </p>
            )}

            {programId && (
              <div className="border-t border-neutral-800 px-4 py-4 sm:px-6">
                <Button
                  className={clsx(primaryButtonClass, 'w-full')}
                  onClick={() =>
                    navigate({
                      to: '/workout',
                      search: { programId, day: workout.day }
                    })
                  }
                >
                  {day.status === 'planned' ? 'Start early' : 'Start workout'}
                  <Play aria-hidden className="fill-current" />
                </Button>
              </div>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
