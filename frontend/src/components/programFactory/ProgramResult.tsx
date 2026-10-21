import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  CSSProperties,
  KeyboardEvent
} from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { useSelector } from 'react-redux'
import { clearProgram } from '@/features/programGeneration/programGenerationSlice'
import { RootState, useAsyncDispatch } from '@/store/store'
import { ProgramStruct, Workout } from '@/types/programCreation'
import { programImport } from '@/services/programsAPI'
import { discardProgramJob } from '@/services/programGenAPI'
import { protectedApiSlice } from '@/services/protectedRoutesAPI'

import { ArrowLeft, ArrowRight, Check, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { panelClass, primaryButtonClass } from '../profile/profileStyles'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

const enter = 'animate-write-in motion-reduce:animate-none'
const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })
const ROW_STAGGER_MS = 40
const MAX_STAGGERED_ROWS = 8

const PANEL_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)'
const PANEL_DURATION_MS = 240

const secondaryButtonClass =
  'h-11 gap-2 rounded-md border border-neutral-700 bg-transparent px-4 text-sm font-semibold text-neutral-100 shadow-none transition-[transform,background-color,border-color] duration-150 ease-out-strong active:scale-[0.97] motion-reduce:active:scale-100 [-webkit-tap-highlight-color:transparent] [@media(hover:hover)]:hover:border-neutral-500 [@media(hover:hover)]:hover:bg-neutral-800/60 focus-visible:ring-2 focus-visible:ring-app-colors-300 focus-visible:ring-offset-2 focus-visible:ring-offset-app-colors-500 sm:h-10 [&_svg]:size-4'

const weekdayIndex = (day: string) => {
  const prefix = day.trim().slice(0, 3).toLowerCase()
  return WEEKDAYS.findIndex((weekday) =>
    weekday.toLowerCase().startsWith(prefix)
  )
}

const isWeekdayProgram = (workouts: Workout[]) => {
  const indices = workouts.map((workout) => weekdayIndex(workout.day))
  return (
    indices.every((index) => index !== -1) &&
    new Set(indices).size === indices.length
  )
}

export const ProgramResult = () => {
  const dispatch = useAsyncDispatch()
  const navigate = useNavigate()
  const programData = useSelector(
    (state: RootState) => state.programGeneration.aiProgram
  )
  const jobId = useSelector(
    (state: RootState) => state.programGeneration.jobId
  )
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn)

  const workouts = programData?.program_structure ?? []
  const tips = programData?.program_tips_and_goals ?? []
  const programName = programData?.name?.trim() || 'Your program'

  const [selectedDay, setSelectedDay] = useState(0)
  const [dayDirection, setDayDirection] = useState<1 | -1 | 0>(0)
  const [openTips, setOpenTips] = useState<Set<string>>(() => new Set(['0-0']))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const headingRef = useRef<HTMLHeadingElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const prevPanelHeightRef = useRef<number | null>(null)
  const panelAnimationRef = useRef<Animation | null>(null)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const isWeek = isWeekdayProgram(workouts)
  const workout = workouts[selectedDay]
  const totalExercises = workouts.reduce(
    (total, day) => total + day.exercises.length,
    0
  )
  const hasSwitchedDay = dayDirection !== 0

  const selectDay = (workoutIndex: number) => {
    if (workoutIndex === selectedDay) return

    prevPanelHeightRef.current = panelRef.current?.offsetHeight ?? null
    setDayDirection(workoutIndex > selectedDay ? 1 : -1)
    setSelectedDay(workoutIndex)
  }

  useLayoutEffect(() => {
    const panel = panelRef.current
    const fromHeight = prevPanelHeightRef.current
    prevPanelHeightRef.current = null
    if (!panel || fromHeight === null) return

    panelAnimationRef.current?.cancel()
    panelAnimationRef.current = null

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const toHeight = panel.offsetHeight
    if (reduceMotion || Math.abs(toHeight - fromHeight) < 1) return

    panelAnimationRef.current = panel.animate(
      [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
      { duration: PANEL_DURATION_MS, easing: PANEL_EASING }
    )
  }, [selectedDay])

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = workouts.length - 1
    const next =
      event.key === 'ArrowRight'
        ? selectedDay === last
          ? 0
          : selectedDay + 1
        : event.key === 'ArrowLeft'
          ? selectedDay === 0
            ? last
            : selectedDay - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    selectDay(next)
    tabRefs.current[next]?.focus()
  }

  const toggleTip = (tipId: string) => {
    setOpenTips((current) => {
      const next = new Set(current)
      if (next.has(tipId)) {
        next.delete(tipId)
      } else {
        next.add(tipId)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!programData || saveStatus === 'saving' || saveStatus === 'saved')
      return

    const program: ProgramStruct = {
      program_name: programData.name,
      program_structure: programData.program_structure
    }

    setSaveStatus('saving')
    try {
      await programImport(program)
      // Training reads saved programs from the cached profile query
      dispatch(protectedApiSlice.util.invalidateTags(['Profile']))
      // The program stays on screen; it just won't come back after a refresh once it's saved
      discardProgramJob(jobId)
      setSaveStatus('saved')
    } catch (error) {
      console.error(error)
      setSaveStatus('error')
    }
  }

  const startOver = () => dispatch(clearProgram())

  if (workouts.length === 0) {
    return (
      <section className="w-full max-w-2xl">
        <div className={clsx(enter, panelClass, 'px-4 py-8 sm:px-6')}>
          <h1 className="font-display text-2xl font-bold text-neutral-50">
            This program came back empty
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            No training days were returned. Go back and generate it again.
          </p>
          <Button
            className={clsx(primaryButtonClass, 'mt-6 h-11 sm:h-10')}
            onClick={startOver}
          >
            <ArrowLeft aria-hidden />
            Start over
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="program-result-title"
      className="w-full max-w-2xl pb-20"
    >
      <button
        type="button"
        onClick={startOver}
        style={delay(0)}
        className={clsx(
          enter,
          '-ml-2 inline-flex h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-app-colors-300 outline-none transition-[transform,color] duration-150 ease-out-strong [-webkit-tap-highlight-color:transparent] active:scale-[0.97] focus-visible:ring-1 focus-visible:ring-app-colors-300 motion-reduce:active:scale-100 [@media(hover:hover)]:hover:text-[#a6f062] sm:h-9 [&_svg]:size-4'
        )}
      >
        <ArrowLeft aria-hidden />
        Start over
      </button>

      <header className="mt-4">
        <h1
          ref={headingRef}
          id="program-result-title"
          tabIndex={-1}
          style={delay(40)}
          className={clsx(
            enter,
            'font-display text-4xl font-bold leading-[1.05] tracking-tight text-neutral-50 outline-none [text-wrap:balance] sm:text-5xl'
          )}
        >
          {programName}
        </h1>
        <p
          style={delay(100)}
          className={clsx(enter, 'mt-3 text-sm text-neutral-400 tabular-nums')}
        >
          {workouts.length} training {workouts.length === 1 ? 'day' : 'days'}
          {isWeek && ' a week'}
          <span aria-hidden className="px-1.5 text-neutral-600">
            ·
          </span>
          {totalExercises} {totalExercises === 1 ? 'exercise' : 'exercises'}
        </p>
      </header>
      <div
        role="tablist"
        aria-label="Training days"
        className="relative mt-8 grid rounded-lg border border-neutral-800 bg-[#141414] p-1"
        style={{
          gridTemplateColumns: `repeat(${workouts.length}, minmax(0, 1fr))`
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-md bg-app-colors-400 transition-transform duration-300 ease-out-strong motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.5rem) / ${workouts.length})`,
            transform: `translateX(${selectedDay * 100}%)`
          }}
        />
        {workouts.map((day, index) => {
          const isSelected = index === selectedDay

          return (
            <button
              key={`${day.day}-${index}`}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              id={`program-tab-${index}`}
              aria-selected={isSelected}
              aria-controls="program-day-panel"
              tabIndex={isSelected ? 0 : -1}
              onClick={() => selectDay(index)}
              onKeyDown={handleTabKeyDown}
              style={delay(140 + index * 30)}
              className={clsx(
                enter,
                'relative flex h-14 min-w-0 flex-col items-center justify-center rounded-md outline-none transition-[color,transform] duration-150 ease-out-strong [-webkit-tap-highlight-color:transparent] active:scale-[0.96] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-app-colors-300 motion-reduce:active:scale-100',
                isSelected
                  ? 'text-app-colors-300'
                  : 'text-neutral-400 [@media(hover:hover)]:hover:text-neutral-200'
              )}
            >
              <span className="max-w-full truncate px-0.5 text-sm font-medium leading-none">
                <span className={clsx(isWeek && 'sm:hidden')}>
                  {isWeek ? day.day.trim().slice(0, 3) : day.day}
                </span>
                {isWeek && <span className="hidden sm:inline">{day.day}</span>}
              </span>
            </button>
          )
        })}
      </div>

      <div
        ref={panelRef}
        id="program-day-panel"
        role="tabpanel"
        aria-labelledby={`program-tab-${selectedDay}`}
        style={delay(260)}
        className={clsx(enter, panelClass, 'mt-3 overflow-hidden')}
      >
        <div
          key={selectedDay}
          className={clsx(
            hasSwitchedDay &&
              'duration-200 ease-out-strong animate-in fade-in motion-reduce:animate-none',
            dayDirection === 1 && 'motion-safe:slide-in-from-right-2',
            dayDirection === -1 && 'motion-safe:slide-in-from-left-2'
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold leading-tight text-neutral-50">
                {workout.day}
              </h2>
              <p className="mt-0.5 text-sm leading-snug text-app-colors-300">
                {workout.focus}
              </p>
            </div>
            <p className="shrink-0 pt-1.5 text-sm text-neutral-400 tabular-nums">
              {workout.exercises.length}{' '}
              {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
            </p>
          </div>

          <ol>
            {workout.exercises.map((exercise, index) => {
              const tipId = `${selectedDay}-${index}`
              const hasTip = Boolean(exercise.exercise_tip?.trim())
              const isOpen = hasTip && openTips.has(tipId)
              const rowContent = (
                <>
                  <span
                    aria-hidden
                    className="w-5 shrink-0 text-sm tabular-nums text-neutral-500"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[0.9375rem] font-medium leading-snug text-neutral-100">
                    {exercise.name}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-neutral-300">
                    {exercise.sets} &times; {exercise.reps}
                    <span className="sr-only">
                      {' '}
                      ({exercise.sets} sets of {exercise.reps} reps)
                    </span>
                  </span>
                </>
              )

              return (
                <li
                  key={tipId}
                  style={
                    hasSwitchedDay
                      ? undefined
                      : delay(
                          300 +
                            Math.min(index, MAX_STAGGERED_ROWS) * ROW_STAGGER_MS
                        )
                  }
                  className={clsx(
                    !hasSwitchedDay && enter,
                    'border-t border-neutral-800/70 first:border-t-0',
                    hasTip &&
                      'group transition-colors duration-150 [@media(hover:hover)]:hover:bg-neutral-800/40'
                  )}
                >
                  {hasTip ? (
                    <>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`tip-${tipId}`}
                        onClick={() => toggleTip(tipId)}
                        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-app-colors-300 sm:px-6"
                      >
                        {rowContent}
                        <Plus
                          aria-hidden
                          className={clsx(
                            'size-4 shrink-0 transition-[transform,color] duration-200 ease-out-strong',
                            isOpen
                              ? 'rotate-45 text-app-colors-300'
                              : 'text-neutral-500 [@media(hover:hover)]:group-hover:text-neutral-300'
                          )}
                        />
                      </button>
                      <div
                        id={`tip-${tipId}`}
                        onClick={() => {
                          if (isOpen && !window.getSelection()?.toString()) {
                            toggleTip(tipId)
                          }
                        }}
                        className={clsx(
                          'grid transition-[grid-template-rows,opacity] duration-200 ease-out-strong motion-reduce:transition-none',
                          isOpen && 'cursor-pointer',
                          isOpen
                            ? 'grid-rows-[1fr] opacity-100'
                            : 'grid-rows-[0fr] opacity-0'
                        )}
                      >
                        <p className="overflow-hidden text-sm leading-relaxed text-neutral-400">
                          <span className="block pb-4 pl-12 pr-11 sm:pl-14 sm:pr-[3.25rem]">
                            {exercise.exercise_tip}
                          </span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 py-3 pl-4 pr-11 sm:pl-6 sm:pr-[3.25rem]">
                      {rowContent}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {tips.length > 0 && (
        <section aria-labelledby="program-tips-title" className="mt-12">
          <h2
            id="program-tips-title"
            style={delay(420)}
            className={clsx(
              enter,
              'font-display text-xl font-bold text-neutral-50'
            )}
          >
            Tips and goals
          </h2>
          <ol className="mt-4 flex flex-col gap-4">
            {tips.map((tip, index) => (
              <li
                key={index}
                style={delay(460 + Math.min(index, MAX_STAGGERED_ROWS) * 40)}
                className={clsx(enter, 'flex gap-3')}
              >
                <span
                  aria-hidden
                  className="w-5 shrink-0 pt-px text-sm font-semibold tabular-nums text-app-colors-300"
                >
                  {index + 1}
                </span>
                <p className="max-w-prose text-[0.9375rem] leading-relaxed text-neutral-300">
                  {tip}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div
        style={delay(560)}
        className={clsx(
          enter,
          panelClass,
          'mt-12 flex flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6'
        )}
      >
        {isLoggedIn ? (
          <>
            <div className="min-w-0" aria-live="polite">
              <p className="text-base font-semibold text-neutral-50">
                {saveStatus === 'saved'
                  ? 'Saved to your programs'
                  : 'Save this program'}
              </p>
              {saveStatus === 'error' ? (
                <p role="alert" className="mt-1 text-sm text-red-400">
                  We couldn&rsquo;t save it. Check your connection and try
                  again.
                </p>
              ) : (
                <p className="mt-1 text-sm leading-snug text-neutral-400">
                  {saveStatus === 'saved'
                    ? 'Set it as active in Training to start logging workouts.'
                    : 'Keep it in Training, where you can set it as active and log workouts.'}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                className={clsx(secondaryButtonClass, 'w-full sm:w-auto')}
                onClick={startOver}
              >
                Generate another
              </Button>
              {saveStatus === 'saved' ? (
                <Button
                  className={clsx(
                    primaryButtonClass,
                    'h-11 w-full sm:h-10 sm:w-auto sm:min-w-[9.5rem]'
                  )}
                  onClick={() => navigate({ to: '/training' })}
                >
                  <span
                    key="saved"
                    className="inline-flex items-center gap-2 duration-200 ease-out-strong animate-in fade-in motion-reduce:animate-none"
                  >
                    <Check aria-hidden />
                    View in Training
                    <ArrowRight aria-hidden />
                  </span>
                </Button>
              ) : (
                <Button
                  className={clsx(
                    primaryButtonClass,
                    'h-11 w-full disabled:opacity-100 sm:h-10 sm:w-auto sm:min-w-[9.5rem]'
                  )}
                  disabled={saveStatus === 'saving'}
                  onClick={handleSave}
                >
                  <span
                    key={saveStatus}
                    className="inline-flex items-center gap-2 duration-200 ease-out-strong animate-in fade-in motion-reduce:animate-none"
                  >
                    {saveStatus === 'saving' && (
                      <Spinner aria-hidden className="size-4" />
                    )}
                    {saveStatus === 'saving'
                      ? 'Saving'
                      : saveStatus === 'error'
                        ? 'Try again'
                        : 'Save program'}
                  </span>
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-base font-semibold text-neutral-50">
                Save programs to your account
              </p>
              <p className="mt-1 text-sm leading-snug text-neutral-400">
                With an account you can save the programs you generate, set an
                active program and track your workout streak.
              </p>
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
              <Button
                asChild
                variant="outline"
                className={clsx(secondaryButtonClass, 'w-full sm:w-auto')}
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className={clsx(
                  primaryButtonClass,
                  'h-11 w-full sm:h-10 sm:w-auto'
                )}
              >
                <Link to="/registerUser">Create account</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
