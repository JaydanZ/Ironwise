import { useMemo } from 'react'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { Workout } from '@/types/programCreation'
import { WorkoutTracker } from '@/types/profile'
import {
  panelClass,
  panelHeaderClass,
  panelTitleClass,
  skeletonClass
} from '../profile/profileStyles'
import { buildWeek, WeekDay, WeekDayStatus } from './weekPlan'
import { WorkoutDayDialog } from './WorkoutDayDialog'

interface WeekStripProps {
  programId?: string
  structure?: Workout[] | null
  history?: WorkoutTracker[] | null
  isLoading?: boolean
}

const STATUS_LABEL: Record<WeekDayStatus, string> = {
  done: 'workout logged',
  missed: 'missed',
  today: 'scheduled today',
  planned: 'scheduled',
  rest: 'rest day'
}

const StatusMark = ({ status }: { status: WeekDayStatus }) => {
  if (status === 'done') {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-app-colors-300 text-app-colors-500">
        <Check aria-hidden strokeWidth={3} className="size-4" />
      </span>
    )
  }
  if (status === 'rest') {
    return (
      <span className="flex size-7 items-center justify-center text-neutral-600">
        &ndash;
      </span>
    )
  }
  return (
    <span
      className={clsx(
        'block size-7 rounded-full border-2',
        status === 'today' && 'border-app-colors-300',
        status === 'planned' && 'border-neutral-600',
        status === 'missed' && 'border-neutral-700 bg-neutral-800/70'
      )}
    />
  )
}

const DayTile = ({ day, programId }: { day: WeekDay; programId?: string }) => {
  const focus = day.workout?.focus
  const tileClass = clsx(
    'flex w-full min-w-0 flex-col items-center gap-2 rounded-md border px-1 py-3',
    day.isToday
      ? 'border-app-colors-300/40 bg-app-colors-300/[0.06]'
      : 'border-transparent'
  )
  const content = (
    <>
      <span className="sr-only">
        {day.shortName} {day.dayOfMonth}
        {focus ? `, ${focus}` : ''}: {STATUS_LABEL[day.status]}
      </span>
      <span aria-hidden className="flex flex-col items-center leading-none">
        <span
          className={clsx(
            'text-xs font-medium',
            day.isToday ? 'text-app-colors-300' : 'text-neutral-400'
          )}
        >
          {day.shortName}
        </span>
        <span className="mt-1 text-sm font-semibold tabular-nums text-neutral-100">
          {day.dayOfMonth}
        </span>
      </span>
      <span aria-hidden className="flex">
        <StatusMark status={day.status} />
      </span>
      <span
        aria-hidden
        title={focus}
        className={clsx(
          'hidden w-full truncate px-1 text-center text-xs sm:block',
          day.status === 'missed' ? 'text-neutral-500' : 'text-neutral-400'
        )}
      >
        {focus ?? 'Rest'}
      </span>
    </>
  )

  return (
    <li
      aria-current={day.isToday ? 'date' : undefined}
      className="flex min-w-0"
    >
      {day.workout ? (
        <WorkoutDayDialog day={day} programId={programId}>
          <button
            type="button"
            className={clsx(
              tileClass,
              'cursor-pointer select-none outline-none transition-[transform,background-color] duration-150 ease-out-strong [-webkit-tap-highlight-color:transparent] [touch-action:manipulation] [@media(hover:hover)]:hover:bg-neutral-800/60 focus-visible:ring-1 focus-visible:ring-app-colors-300 active:scale-[0.96] data-[state=open]:bg-neutral-800/60 motion-reduce:active:scale-100',
              day.isToday &&
                '[@media(hover:hover)]:hover:bg-app-colors-300/[0.1]'
            )}
          >
            {content}
          </button>
        </WorkoutDayDialog>
      ) : (
        <div className={tileClass}>{content}</div>
      )}
    </li>
  )
}

const WeekStripSkeleton = () => (
  <section className={panelClass} aria-busy="true" aria-label="This week">
    <div className={panelHeaderClass}>
      <div className={clsx(skeletonClass, 'h-5 w-24')} />
      <div className={clsx(skeletonClass, 'h-4 w-32')} />
    </div>
    <div className="grid grid-cols-7 gap-1 px-2 py-3 sm:gap-2 sm:px-4">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex flex-col items-center gap-2 py-3">
          <div className={clsx(skeletonClass, 'h-3 w-7')} />
          <div className={clsx(skeletonClass, 'h-4 w-5')} />
          <div className={clsx(skeletonClass, 'size-7 rounded-full')} />
          <div className={clsx(skeletonClass, 'hidden h-3 w-12 sm:block')} />
        </div>
      ))}
    </div>
  </section>
)

export const WeekStrip = ({
  programId,
  structure,
  history,
  isLoading
}: WeekStripProps) => {
  const week = useMemo(
    () => buildWeek(new Date(), structure ?? [], history ?? []),
    [structure, history]
  )

  if (isLoading) return <WeekStripSkeleton />

  const hasProgram = Boolean(structure?.length)
  const summary = hasProgram
    ? `${week.completedCount} of ${week.scheduledCount} ${
        week.scheduledCount === 1 ? 'session' : 'sessions'
      } done`
    : `${week.completedCount} ${
        week.completedCount === 1 ? 'workout' : 'workouts'
      } logged`

  return (
    <section aria-labelledby="this-week-title" className={panelClass}>
      <div className={panelHeaderClass}>
        <h2 id="this-week-title" className={panelTitleClass}>
          This week
        </h2>
        <p className="text-sm tabular-nums text-neutral-400">{summary}</p>
      </div>
      <ol className="grid grid-cols-7 gap-1 px-2 py-3 sm:gap-2 sm:px-4">
        {week.days.map((day) => (
          <DayTile key={day.date} day={day} programId={programId} />
        ))}
      </ol>
    </section>
  )
}
