import { CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'
import {
  BatteryFull,
  Check,
  ChevronDown,
  Flame,
  Play,
  Power,
  Search,
  SignalHigh,
  Trash2,
  Wifi
} from 'lucide-react'
import { IoHomeOutline, IoPersonOutline } from 'react-icons/io5'
import { LuDumbbell } from 'react-icons/lu'
import {
  PREVIEW_ACCOUNT,
  PREVIEW_HISTORY,
  PREVIEW_PROGRAMS,
  PREVIEW_WEEK,
  PreviewDayStatus,
  SAMPLE_WEEK
} from '@/data/landingData'

const panel = 'rounded-[10px] border border-neutral-800 bg-[#141414]'
const panelHeader =
  'flex items-center justify-between gap-2 border-b border-neutral-800 px-3.5 py-3'

export const PhoneFrame = ({
  children,
  label,
  className,
  style
}: {
  children: ReactNode
  label: string
  className?: string
  style?: CSSProperties
}) => (
  <figure
    className={clsx(
      'relative h-[620px] w-[300px] rounded-[52px] bg-[linear-gradient(150deg,#2a2d33_0%,#101114_38%,#1a1c20_100%)] p-[9px] shadow-[0_50px_90px_-30px_rgba(0,0,0,0.85),0_18px_40px_-20px_rgba(16,33,94,0.9),inset_0_0_0_1px_rgba(255,255,255,0.09)]',
      className
    )}
    style={style}
  >
    <figcaption className="sr-only">{label}</figcaption>
    <div className="relative size-full overflow-hidden rounded-[43px] bg-app-colors-500 font-main-font ring-1 ring-black">
      <div className="absolute inset-x-0 top-0 z-20 flex h-[46px] items-start justify-between bg-gradient-to-b from-app-colors-500 from-60% to-transparent px-7 pt-[15px] text-[13px] font-semibold text-neutral-50">
        <span className="tabular-nums">9:41</span>
        <span className="flex items-center gap-1 [&_svg]:size-[15px]">
          <SignalHigh strokeWidth={2.5} />
          <Wifi strokeWidth={2.5} />
          <BatteryFull strokeWidth={2} className="!size-[19px]" />
        </span>
      </div>
      <div className="absolute left-1/2 top-[10px] z-30 h-[27px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
      {children}
    </div>
    <span className="pointer-events-none absolute inset-[9px] rounded-[43px] bg-[linear-gradient(115deg,rgba(255,255,255,0.07)_0%,transparent_32%)]" />
  </figure>
)

const TabBar = ({ active }: { active: 'Home' | 'Training' }) => {
  const tabs = [
    { id: 'Home', icon: <IoHomeOutline /> },
    { id: 'Training', icon: <LuDumbbell /> },
    { id: 'Profile', icon: <IoPersonOutline /> }
  ]
  const activeIndex = tabs.findIndex((tab) => tab.id === active)

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 border-t border-neutral-800/80 bg-app-colors-500/85 pb-[22px] backdrop-blur-xl">
      <div className="relative grid grid-cols-3 px-2 pt-1">
        <span
          className="absolute -top-px left-2 flex h-[2px] w-[calc((100%-1rem)/3)] justify-center"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="h-full w-7 rounded-full bg-app-colors-300" />
        </span>
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className="flex h-12 flex-col items-center justify-center gap-1 [&_svg]:size-[20px]"
          >
            <span
              className={
                tab.id === active ? 'text-app-colors-300' : 'text-neutral-500'
              }
            >
              {tab.icon}
            </span>
            <span
              className={clsx(
                'text-[10px] font-medium',
                tab.id === active ? 'text-neutral-50' : 'text-neutral-500'
              )}
            >
              {tab.id}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

const DayMark = ({ status }: { status: PreviewDayStatus }) => {
  if (status === 'done') {
    return (
      <span className="flex size-[22px] items-center justify-center rounded-full bg-app-colors-300 text-app-colors-500">
        <Check strokeWidth={3} className="size-3" />
      </span>
    )
  }
  if (status === 'rest') {
    return (
      <span className="flex size-[22px] items-center justify-center text-[12px] text-neutral-600">
        &ndash;
      </span>
    )
  }
  return (
    <span
      className={clsx(
        'block size-[22px] rounded-full border-2',
        status === 'today' ? 'border-app-colors-300' : 'border-neutral-600'
      )}
    />
  )
}

// A fixed pattern so the grid looks lived-in without being random on every render
const ACTIVITY = Array.from({ length: 18 * 7 }, (_, index) => {
  const week = Math.floor(index / 7)
  const day = index % 7
  if (day === 0 || day === 3 || day === 6) return false
  return (week * 7 + day * 3) % 11 !== 0 && week > 1
})

const NextWorkoutPanel = ({ className }: { className?: string }) => {
  const thursday = SAMPLE_WEEK[2]

  return (
  <section className={clsx(panel, className)}>
    <div className={panelHeader}>
      <p className="text-[13px] font-semibold text-neutral-50">
        Next workout
      </p>
      <span className="rounded-full bg-app-colors-300/15 px-2 py-0.5 text-[10px] font-medium text-app-colors-300">
        Today
      </span>
    </div>
    <div className="px-3.5 pt-3.5">
      <p className="font-display text-[24px] font-bold leading-none text-neutral-50">
        {thursday.day}
      </p>
      <p className="mt-1.5 text-[11px] text-app-colors-300">
        {thursday.focus}
      </p>
      <p className="mt-0.5 text-[11px] text-neutral-400">
        {PREVIEW_ACCOUNT.programName}
      </p>
      <span className="mt-3.5 inline-flex h-8 items-center gap-1.5 rounded-md bg-app-colors-300 px-3 text-[11px] font-semibold text-app-colors-500">
        Start workout
        <Play className="size-3 fill-current" />
      </span>
    </div>
    <ul className="px-3.5 pb-1 pt-2">
      {thursday.exercises.map((exercise) => (
        <li
          key={exercise.name}
          className="flex min-h-9 items-center gap-2 border-t border-neutral-800/80 py-2 first:border-t-0"
        >
          <span className="flex-1 truncate text-[11.5px] text-neutral-100">
            {exercise.name}
          </span>
          <span className="text-[10.5px] tabular-nums text-neutral-400">
            {exercise.sets} &times; {exercise.reps}
          </span>
        </li>
      ))}
    </ul>
  </section>
  )
}

export const HomeScreen = () => {
  return (
    <>
      <div className="phone-scroll absolute inset-x-0 top-0 px-3 pt-[58px]">
        <p className="font-display text-[24px] font-bold leading-tight text-neutral-50">
          Hi, {PREVIEW_ACCOUNT.username}
        </p>
        <p className="mt-0.5 text-[11px] text-neutral-400">
          {PREVIEW_ACCOUNT.email}
        </p>

        <section className={clsx(panel, 'mt-4')}>
          <div className={panelHeader}>
            <p className="text-[13px] font-semibold text-neutral-50">
              This week
            </p>
            <p className="text-[11px] tabular-nums text-neutral-400">
              2 of 4 sessions done
            </p>
          </div>
          <ol className="grid grid-cols-7 px-1 py-2">
            {PREVIEW_WEEK.map((day) => (
              <li
                key={day.shortName}
                className={clsx(
                  'flex flex-col items-center gap-1.5 rounded-md border py-2',
                  day.status === 'today'
                    ? 'border-app-colors-300/40 bg-app-colors-300/[0.06]'
                    : 'border-transparent'
                )}
              >
                <span className="flex flex-col items-center leading-none">
                  <span
                    className={clsx(
                      'text-[9px] font-medium',
                      day.status === 'today'
                        ? 'text-app-colors-300'
                        : 'text-neutral-400'
                    )}
                  >
                    {day.shortName}
                  </span>
                  <span className="mt-1 text-[11px] font-semibold tabular-nums text-neutral-100">
                    {day.dayOfMonth}
                  </span>
                </span>
                <DayMark status={day.status} />
              </li>
            ))}
          </ol>
        </section>

        <NextWorkoutPanel className="mt-3" />

        <section className={clsx(panel, 'mt-3')}>
          <div className={panelHeader}>
            <div>
              <p className="text-[13px] font-semibold text-neutral-50">
                Activity
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-400">
                {PREVIEW_ACCOUNT.workoutsLogged} workouts in the last year
              </p>
            </div>
            <p className="flex items-center gap-1 text-[10px] text-neutral-400">
              <Flame className="size-3.5 text-app-colors-300" />
              <span className="font-display text-[17px] font-bold tabular-nums text-neutral-50">
                {PREVIEW_ACCOUNT.streak}
              </span>
              day streak
            </p>
          </div>
          <div className="grid grid-flow-col grid-rows-7 justify-start gap-[3px] px-3.5 py-3.5">
            {ACTIVITY.map((worked, index) => (
              <span
                key={index}
                className={clsx(
                  'size-[10px] rounded-[2px]',
                  worked ? 'bg-app-colors-300' : 'bg-neutral-800/70'
                )}
              />
            ))}
          </div>
        </section>
      </div>
      <TabBar active="Home" />
    </>
  )
}

export const TrainingScreen = () => (
  <>
    <div className="phone-scroll phone-scroll-late absolute inset-x-0 top-0 px-3 pt-[58px]">
      <p className="font-display text-[24px] font-bold leading-tight text-neutral-50">
        Training
      </p>
      <p className="mt-0.5 text-[11px] text-neutral-400">
        Your next session, saved programs and workout log.
      </p>
      <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-app-colors-300 px-3 text-[11px] font-semibold text-app-colors-500">
        Create a Program
        <ChevronDown className="size-3" />
      </span>

      <NextWorkoutPanel className="mt-4" />

      <section className={clsx(panel, 'mt-3')}>
        <div className={panelHeader}>
          <p className="text-[13px] font-semibold text-neutral-50">
            Saved programs
          </p>
          <span className="text-[11px] tabular-nums text-neutral-400">
            {PREVIEW_PROGRAMS.length}
          </span>
        </div>
        <div className="border-b border-neutral-800 px-3.5 py-2.5">
          <span className="flex h-8 items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 px-2.5 text-[11px] text-neutral-500">
            <Search className="size-3.5" />
            Search programs
          </span>
        </div>
        <ul>
          {PREVIEW_PROGRAMS.map((program) => (
            <li
              key={program.name}
              className="flex min-h-[54px] items-center gap-2 border-t border-neutral-800/80 px-3.5 py-2.5 first:border-t-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-neutral-50">
                  {program.name}
                </span>
                <span className="mt-0.5 block text-[10.5px] text-neutral-400">
                  {program.isActive && (
                    <span className="font-medium text-app-colors-300">
                      Active &middot;{' '}
                    </span>
                  )}
                  {program.days} days a week
                </span>
              </span>
              <Power
                className={clsx(
                  'size-[15px]',
                  program.isActive
                    ? 'text-app-colors-300 [filter:drop-shadow(0_0_4px_rgba(148,234,67,0.7))]'
                    : 'text-neutral-500'
                )}
              />
              <Trash2 className="ml-2 size-[15px] text-neutral-400" />
            </li>
          ))}
        </ul>
      </section>

      <section className={clsx(panel, 'mt-3')}>
        <div className={panelHeader}>
          <p className="text-[13px] font-semibold text-neutral-50">
            Previous workouts
          </p>
          <span className="text-[11px] tabular-nums text-neutral-400">
            {PREVIEW_ACCOUNT.workoutsLogged}
          </span>
        </div>
        <ul>
          {PREVIEW_HISTORY.map((workout) => (
            <li
              key={workout.day}
              className="flex min-h-[58px] items-center gap-2.5 border-t border-neutral-800 px-3.5 py-2.5 first:border-t-0"
            >
              <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/70 leading-none">
                <span className="text-[9px] font-medium text-neutral-500">
                  {workout.month}
                </span>
                <span className="mt-0.5 text-[14px] font-semibold tabular-nums text-neutral-50">
                  {workout.day}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-neutral-50">
                  {workout.focus}
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] text-neutral-400">
                  {workout.weekday} / {PREVIEW_ACCOUNT.programName}
                </span>
              </span>
              <span className="text-[11px] font-medium tabular-nums text-neutral-300">
                {workout.sets} sets
              </span>
              <ChevronDown className="size-3.5 text-neutral-500" />
            </li>
          ))}
        </ul>
      </section>
    </div>
    <TabBar active="Training" />
  </>
)
