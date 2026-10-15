import { useId, useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, Dumbbell, Trophy } from 'lucide-react'
import { useGetLiftHistoryQuery } from '@/services/protectedRoutesAPI'
import { Button } from '@/components/ui/button'
import {
  panelClass,
  panelHeaderClass,
  panelTitleClass,
  skeletonClass
} from '../profile/profileStyles'
import { parseLogDate } from '../training/workoutHistory'
import { ExerciseTrendChart } from './ExerciseTrendChart'
import {
  BestSet,
  buildExerciseTrend,
  findBestLifts,
  findRecentRecords,
  formatWeight,
  trendExercises
} from './progress'

const sectionTitleClass = 'text-sm font-medium text-neutral-300'

const shortDate = (value: string): string =>
  parseLogDate(value)?.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) ?? value

const relativeDay = (value: string): string => {
  const date = parseLogDate(value)
  if (!date) return value
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((today.getTime() - date.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return shortDate(value)
}

interface LiftRowProps {
  exercise: string
  date: string
  set: BestSet
  gain?: number
}

const LiftRow = ({ exercise, date, set, gain }: LiftRowProps) => {
  const isRecord = gain !== undefined
  const Icon = isRecord ? Trophy : Dumbbell
  return (
    <li className="flex min-h-14 items-center gap-3 border-t border-neutral-800/80 py-3 first:border-t-0">
      <span
        className={clsx(
          'flex size-9 shrink-0 items-center justify-center rounded-md',
          isRecord
            ? 'bg-app-colors-300/10 text-app-colors-300'
            : 'bg-neutral-800/80 text-neutral-300'
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-medium leading-snug text-neutral-50">
          {exercise}
        </span>
        <span className="mt-0.5 block text-sm tabular-nums text-neutral-400">
          {formatWeight(set.weight)} {set.unit} &times; {set.reps}
          <span aria-hidden> &middot; </span>
          <span className="sr-only">, </span>
          {relativeDay(date)}
        </span>
      </span>
      <span className="shrink-0 text-right tabular-nums">
        <span className="block text-sm font-semibold text-neutral-50">
          {formatWeight(set.e1rm)} {set.unit}
          <span className="sr-only"> estimated one-rep max</span>
        </span>
        {isRecord && (
          <span className="block text-xs text-app-colors-300">
            +{formatWeight(gain)} {set.unit}
          </span>
        )}
      </span>
    </li>
  )
}

const ProgressSkeleton = () => (
  <div
    aria-busy="true"
    aria-label="Loading progress"
    className="px-4 py-5 sm:px-6"
  >
    <div className={clsx(skeletonClass, 'h-4 w-28')} />
    {Array.from({ length: 2 }).map((_, index) => (
      <div key={index} className="mt-4 flex items-center gap-3">
        <div className={clsx(skeletonClass, 'size-9 rounded-md')} />
        <div className="flex-1">
          <div className={clsx(skeletonClass, 'h-4 w-2/5')} />
          <div className={clsx(skeletonClass, 'mt-2 h-3 w-1/4')} />
        </div>
        <div className={clsx(skeletonClass, 'h-4 w-14')} />
      </div>
    ))}
    <div className={clsx(skeletonClass, 'mt-8 h-44 w-full')} />
  </div>
)

export const ProgressPanel = () => {
  const selectId = useId()
  const [selected, setSelected] = useState<string | null>(null)
  const { data, isLoading, isError, isFetching, refetch } =
    useGetLiftHistoryQuery()

  const workouts = useMemo(() => data ?? [], [data])
  const records = useMemo(() => findRecentRecords(workouts), [workouts])
  const bestLifts = useMemo(() => findBestLifts(workouts), [workouts])
  const exercises = useMemo(() => trendExercises(workouts), [workouts])

  const exercise =
    selected && exercises.includes(selected) ? selected : exercises[0] ?? null
  const trend = useMemo(
    () => (exercise ? buildExerciseTrend(workouts, exercise) : null),
    [workouts, exercise]
  )

  const change = trend
    ? trend.points[trend.points.length - 1].value - trend.points[0].value
    : 0

  return (
    <section aria-labelledby="progress-title" className={panelClass}>
      <div className={panelHeaderClass}>
        <div>
          <h2 id="progress-title" className={panelTitleClass}>
            Progress
          </h2>
          <p className="mt-0.5 text-sm text-neutral-400">
            Estimated 1-rep max from the past year of logged sets
          </p>
        </div>
      </div>

      {isLoading ? (
        <ProgressSkeleton />
      ) : isError && workouts.length === 0 ? (
        <div role="alert" className="px-4 py-8 sm:px-6">
          <p className="font-medium text-neutral-50">
            We couldn&rsquo;t load your progress
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Check your connection, then try again.
          </p>
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 h-10 border border-neutral-700 px-4 text-neutral-100 transition-[transform,background-color] duration-150 hover:bg-neutral-800/70 active:scale-[0.97]"
          >
            {isFetching ? 'Retrying...' : 'Try again'}
          </Button>
        </div>
      ) : bestLifts.length === 0 ? (
        <div className="px-4 py-8 sm:px-6">
          <p className="font-medium text-neutral-50">Nothing to chart yet</p>
          <p className="mt-1 max-w-[48ch] text-sm leading-relaxed text-neutral-400">
            Log a workout with weights and your best lifts will show up here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-800">
          <div className="px-4 py-5 sm:px-6">
            {records.length > 0 ? (
              <>
                <h3 className={sectionTitleClass}>Recent records</h3>
                <ul className="mt-2">
                  {records.map((record) => (
                    <LiftRow
                      key={`${record.exercise}-${record.date}`}
                      exercise={record.exercise}
                      date={record.date}
                      set={record.set}
                      gain={record.set.e1rm - record.previousE1rm}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h3 className={sectionTitleClass}>Best lifts</h3>
                <p className="mt-0.5 text-sm text-neutral-400">
                  Beat one of these to set your first record.
                </p>
                <ul className="mt-2">
                  {bestLifts.map((lift) => (
                    <LiftRow key={lift.exercise} {...lift} />
                  ))}
                </ul>
              </>
            )}
          </div>

          {!trend && (
            <div className="px-4 py-5 sm:px-6">
              <h3 className={sectionTitleClass}>Strength trend</h3>
              <p className="mt-1 max-w-[48ch] text-sm leading-relaxed text-neutral-400">
                Log the same lift in a second workout to see how it&rsquo;s
                trending.
              </p>
            </div>
          )}

          {trend && (
            <div className="px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h3 className={sectionTitleClass}>
                  <label htmlFor={selectId}>Strength trend</label>
                </h3>
                <div className="relative">
                  <select
                    id={selectId}
                    value={exercise ?? ''}
                    onChange={(event) => setSelected(event.target.value)}
                    className="h-10 max-w-56 appearance-none truncate rounded-md border border-neutral-700 bg-neutral-900 py-0 pl-3 pr-9 text-sm text-neutral-100 outline-none transition-colors duration-150 hover:border-neutral-600 focus-visible:border-app-colors-300 focus-visible:ring-1 focus-visible:ring-app-colors-300"
                  >
                    {exercises.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                  />
                </div>
              </div>
              <p className="mb-4 mt-1 text-sm text-neutral-400">
                <span
                  className={clsx(
                    'font-medium tabular-nums',
                    change > 0 ? 'text-app-colors-300' : 'text-neutral-200'
                  )}
                >
                  {change > 0 ? '+' : change < 0 ? '−' : '±'}
                  {formatWeight(Math.abs(change))} {trend.unit}
                </span>{' '}
                since {shortDate(trend.points[0].date)} &middot;{' '}
                {trend.points.length} sessions
              </p>
              <ExerciseTrendChart trend={trend} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
