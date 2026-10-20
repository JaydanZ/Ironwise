import {
  CSSProperties,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import clsx from 'clsx'
import { Flame } from 'lucide-react'
import { WorkoutTracker } from '@/types/profile'
import { localDateString } from '@/hooks/useWorkoutSession'
import {
  panelClass,
  panelHeaderClass,
  panelTitleClass,
  skeletonClass
} from './profileStyles'

interface WorkoutStreakTrackerProps {
  data?: WorkoutTracker[] | null
  streak?: number | null
  isLoading?: boolean
}

const generateYearDates = () => {
  const dates: Date[] = []
  const today = new Date()

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date)
  }

  return dates
}

const formatDateKey = (date: Date): string => localDateString(date)

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

const CELL =
  'size-2.5 sm:size-3 lg:size-[15px] rounded-[3px] [--cell-half:5px] sm:[--cell-half:6px] lg:[--cell-half:7.5px]'

const cascade = (index: number) => ({ '--i': index }) as CSSProperties

export const WorkoutStreakTracker = ({
  data,
  streak,
  isLoading
}: WorkoutStreakTrackerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Drag state lives in a ref so pointer moves never re-render the grid
  const dragRef = useRef<{ startX: number; startScroll: number } | null>(null)
  const [isScrollable, setIsScrollable] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const yearData = useMemo(() => {
    const dates = generateYearDates()
    const workoutMap = new Map<string, WorkoutTracker>()

    if (data) {
      data.forEach((workout) => {
        if (workout.date) {
          workoutMap.set(workout.date, workout)
        }
      })
    }

    const weeks: (Date | null)[][] = []
    let currentWeek: (Date | null)[] = []

    dates.forEach((date) => {
      if (date.getDay() === 0 && currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.unshift(null)
        weeks.push(currentWeek)
        currentWeek = []
      }
      currentWeek.push(date)
    })

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return { weeks, workoutMap }
  }, [data])

  const totalWorkouts = data?.filter((w) => w.has_worked_out).length || 0

  const currentStreak = useMemo(() => {
    if (typeof streak === 'number') return streak
    if (!data) return 0

    const workoutDates = new Set(
      data.filter((w) => w.has_worked_out && w.date).map((w) => w.date)
    )

    const todayDate = new Date()
    const todayKey = formatDateKey(todayDate)
    const yesterdayDate = new Date(todayDate)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayKey = formatDateKey(yesterdayDate)

    if (!workoutDates.has(todayKey) && !workoutDates.has(yesterdayKey)) {
      return 0
    }

    const startDate = workoutDates.has(todayKey) ? todayDate : yesterdayDate
    let count = 0
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(startDate)
      checkDate.setDate(checkDate.getDate() - i)
      if (workoutDates.has(formatDateKey(checkDate))) count++
      else break
    }

    return count
  }, [data, streak])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [yearData, isLoading, data])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setIsScrollable(el.scrollWidth > el.clientWidth + 1)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isLoading])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (
      !el ||
      !isScrollable ||
      event.pointerType !== 'mouse' ||
      event.button !== 0
    )
      return
    dragRef.current = { startX: event.clientX, startScroll: el.scrollLeft }
    el.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    const drag = dragRef.current
    if (!el || !drag) return
    event.preventDefault()
    el.scrollLeft = drag.startScroll - (event.clientX - drag.startX)
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    scrollRef.current?.releasePointerCapture(event.pointerId)
    setIsDragging(false)
  }

  const hasHistory = Array.isArray(data)

  return (
    <section aria-labelledby="activity-title" className={panelClass}>
      <div className={panelHeaderClass}>
        <div>
          <h2 id="activity-title" className={panelTitleClass}>
            Activity
          </h2>
          <p className="mt-0.5 text-sm text-neutral-400">
            {isLoading ? (
              <span className={clsx(skeletonClass, 'inline-block h-3 w-40')} />
            ) : hasHistory ? (
              <span className="inline-block animate-blur-in">
                {`${totalWorkouts} ${
                  totalWorkouts === 1 ? 'workout' : 'workouts'
                } in the last year`}
              </span>
            ) : (
              'Your current training streak'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Flame
            aria-hidden
            className={clsx(
              'size-5',
              currentStreak > 0 ? 'text-app-colors-300' : 'text-neutral-500'
            )}
          />
          <p className="text-sm text-neutral-400">
            {isLoading ? (
              <span
                className={clsx(
                  skeletonClass,
                  'inline-block h-6 w-6 align-middle'
                )}
              />
            ) : (
              <span
                style={cascade(1)}
                className="inline-block animate-blur-in font-display text-2xl font-bold tabular-nums text-neutral-50"
              >
                {currentStreak}
              </span>
            )}{' '}
            day streak
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 py-5 sm:px-6">
          <div
            className={clsx(
              skeletonClass,
              'h-[116px] w-full sm:h-[130px] lg:h-[151px]'
            )}
          />
          <div className="mt-3 flex h-4 items-center justify-end">
            <div className={clsx(skeletonClass, 'h-3 w-28')} />
          </div>
        </div>
      ) : (
        <div className="px-4 py-5 sm:px-6">
          <div
            ref={scrollRef}
            tabIndex={isScrollable ? 0 : undefined}
            aria-label={
              isScrollable
                ? 'Workout activity grid, scroll horizontally'
                : undefined
            }
            role={isScrollable ? 'region' : undefined}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={clsx(
              'overflow-x-auto overscroll-x-contain rounded-sm pb-2 [scrollbar-color:#404040_transparent] [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-app-colors-300',
              isScrollable && 'cursor-grab',
              isDragging && 'cursor-grabbing select-none'
            )}
          >
            <div
              role="img"
              aria-label={`Workout activity for the last year: ${totalWorkouts} workouts, current streak ${currentStreak} days`}
              className="flex w-max"
            >
              <div
                style={cascade(1)}
                className="sticky left-0 z-10 flex animate-fade-in flex-col gap-[3px] bg-[#141414] pr-2 pt-5"
              >
                {DAY_LABELS.map((day, index) => (
                  <div
                    key={index}
                    className="flex h-2.5 items-center text-[10px] text-neutral-400 sm:h-3 lg:h-[15px]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="flex flex-col">
                <div
                  style={cascade(1)}
                  className="mb-1.5 flex animate-fade-in gap-[3px]"
                >
                  {yearData.weeks.map((week, weekIndex) => {
                    const firstDay = week.find((day) => day !== null)
                    const prevFirstDay = yearData.weeks[weekIndex - 1]?.find(
                      (day) => day !== null
                    )
                    const isNewMonth =
                      firstDay &&
                      (weekIndex === 0 ||
                        firstDay.getMonth() !== prevFirstDay?.getMonth())

                    return (
                      <div
                        key={weekIndex}
                        className="relative h-3.5 w-2.5 text-[10px] leading-none text-neutral-400 sm:w-3 lg:w-[15px]"
                      >
                        {isNewMonth && (
                          <span className="absolute left-0 top-0 whitespace-nowrap">
                            {MONTH_LABELS[firstDay.getMonth()]}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div
                  className={clsx(
                    'flex gap-[3px] transition-opacity duration-200',
                    isLoading && 'animate-pulse opacity-60'
                  )}
                >
                  {yearData.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[3px]">
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const date = week[dayIndex]
                        if (!date) {
                          return <div key={dayIndex} className={CELL} />
                        }

                        const workout = yearData.workoutMap.get(
                          formatDateKey(date)
                        )
                        const hasWorkedOut = workout?.has_worked_out ?? false

                        return (
                          <div
                            key={dayIndex}
                            style={cascade(weekIndex + dayIndex)}
                            className={clsx(
                              CELL,
                              'animate-cell-in',
                              hasWorkedOut
                                ? 'bg-app-colors-300'
                                : 'bg-neutral-800/70'
                            )}
                            title={`${date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}${hasWorkedOut ? ', workout completed' : ''}`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            style={cascade(10)}
            className="mt-3 flex animate-fade-in flex-wrap items-center justify-between gap-3 text-xs text-neutral-400"
          >
            <p>
              {!hasHistory
                ? 'Day-by-day workout history isn’t recorded yet.'
                : totalWorkouts === 0
                  ? 'No workouts logged in the last year.'
                  : ''}
            </p>
            <div className="flex items-center gap-2">
              <span>Rest</span>
              <div className={clsx(CELL, 'bg-neutral-800/70')} />
              <div className={clsx(CELL, 'bg-app-colors-300')} />
              <span>Workout</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
