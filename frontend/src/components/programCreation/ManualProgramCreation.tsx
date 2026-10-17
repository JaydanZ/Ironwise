import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm, useStore } from '@tanstack/react-form'
import { useDispatch } from 'react-redux'
import { motion, MotionConfig, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import useIsMobile from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Star,
  Trash2
} from 'lucide-react'
import { ProgramStruct, WorkoutProgram } from '@/types/programCreation'
import { programImport, updateProgram } from '@/services/programsAPI'
import { toast } from '@/hooks/use-toast'
import { protectedApiSlice } from '@/services/protectedRoutesAPI'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '../ui/dropdown-menu'
import {
  iconButtonClass,
  panelClass,
  panelHeaderClass,
  primaryButtonClass
} from '../profile/profileStyles'
import {
  menuCollisionPadding,
  menuContentClass,
  menuItemClass
} from './menuStyles'
import { fixedNavInsets, scrollTargetForCard } from './scrollToCard'
import {
  EditableField,
  fieldKey,
  findProgramEdits,
  programBaseline,
  textChanged
} from './programEdits'

import {
  MAX_EXERCISE_NAME_LENGTH,
  MAX_EXERCISES_PER_DAY,
  MAX_FOCUS_LENGTH,
  MAX_PROGRAM_NAME_LENGTH,
  MAX_SETS_OR_REPS,
  WEEKDAYS
} from '@/constants/programRules'

type SaveStatus = 'idle' | 'saving' | 'error'

interface ExerciseDraft {
  id: string
  name: string
  sets: string
  reps: string
  exerciseTip: string
}

interface DayDraft {
  id: string
  focus: string
  day: string
  exercises: ExerciseDraft[]
}

let nextDraftId = 0
const draftId = () => String(nextDraftId++)

const newExercise = (): ExerciseDraft => ({
  id: draftId(),
  name: '',
  sets: '3',
  reps: '10',
  exerciseTip: ''
})

const newDay = (usedDays: string[]): DayDraft => ({
  id: draftId(),
  focus: '',
  day: WEEKDAYS.find((weekday) => !usedDays.includes(weekday)) ?? WEEKDAYS[0],
  exercises: [newExercise()]
})

const draftsFromProgram = (program: WorkoutProgram): DayDraft[] =>
  program.program_structure.map((workout) => ({
    id: draftId(),
    focus: workout.focus,
    day: workout.day,
    exercises: workout.exercises.map((exercise) => ({
      id: draftId(),
      name: exercise.name,
      sets: String(exercise.sets),
      reps: String(exercise.reps),
      exerciseTip: exercise.exercise_tip ?? ''
    }))
  }))

const byWeekday = (a: DayDraft, b: DayDraft) =>
  WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)

const sortedDayIds = (days: DayDraft[]) =>
  [...days].sort(byWeekday).map((day) => day.id)

// Whether moving a day to a new weekday changes where it sits in the week
const changesPosition = (days: DayDraft[], dayId: string, weekday: string) => {
  const before = sortedDayIds(days).indexOf(dayId)
  const after = sortedDayIds(
    days.map((day) => (day.id === dayId ? { ...day, day: weekday } : day))
  ).indexOf(dayId)
  return before !== after
}

// Days slide to their new place in the week; no bounce so it reads as a move, not a toy
const reorderTransition = { type: 'spring', duration: 0.35, bounce: 0 } as const

const requiredText = (label: string, maxLength: number) => (value: string) => {
  const length = value.trim().length
  if (length === 0) return `${label} is required`
  if (length > maxLength)
    return `${label} must be ${maxLength} characters or fewer`
  return undefined
}

const validateCount = (label: string) => (value: string) => {
  const count = Number(value)
  if (value.trim().length === 0) return `${label} is required`
  if (!Number.isInteger(count) || count < 1 || count > MAX_SETS_OR_REPS)
    return `${label} must be 1 to ${MAX_SETS_OR_REPS}`
  return undefined
}

const secondaryButtonClass =
  'h-10 gap-2 rounded-md border border-neutral-700 bg-transparent px-4 text-sm font-semibold text-neutral-100 shadow-none transition-[transform,background-color,border-color] duration-150 ease-out-strong active:scale-[0.97] motion-reduce:active:scale-100 [-webkit-tap-highlight-color:transparent] [@media(hover:hover)]:hover:border-neutral-500 [@media(hover:hover)]:hover:bg-neutral-800/60 focus-visible:ring-2 focus-visible:ring-app-colors-300 focus-visible:ring-offset-2 focus-visible:ring-offset-app-colors-500 disabled:opacity-50 [&_svg]:size-4'

const inputClass = (hasError: boolean) =>
  clsx(
    'h-10 border-neutral-700 bg-transparent text-neutral-50',
    hasError && 'border-red-500 focus-visible:ring-0'
  )

const enterClass =
  'duration-200 ease-out-strong animate-in fade-in motion-reduce:animate-none'

function FieldError({ errors }: { errors: unknown[] }) {
  if (errors.length === 0) return null
  return (
    <p role="alert" className="text-sm text-red-400">
      {errors.join(', ')}
    </p>
  )
}

function EditedMark({ id, label }: { id: string; label: string }) {
  return (
    <span
      id={id}
      title={label}
      className="inline-flex items-center text-app-colors-300"
    >
      <Star aria-hidden className="size-3.5 fill-current" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

function useStuckHeader(enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!enabled || !sentinel) return

    const observer = new IntersectionObserver(([entry]) =>
      setIsStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled])

  return { sentinelRef, isStuck: enabled && isStuck }
}

interface ManualProgramCreationProps {
  program?: WorkoutProgram
}

export function ManualProgramCreation({
  program: existingProgram
}: ManualProgramCreationProps = {}) {
  const isEditing = existingProgram !== undefined
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const prefersReducedMotion = useReducedMotion()
  const isMobile = useIsMobile()
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  // Day whose weekday change moved it; the viewport follows it once it lands
  const followDayId = useRef<string | null>(null)
  const { sentinelRef, isStuck } = useStuckHeader(isEditing && isMobile)

  const scrollToDay = (dayId: string) => {
    const card = cardRefs.current.get(dayId)
    if (!card) return
    const rect = card.getBoundingClientRect()
    window.scrollTo({
      top: scrollTargetForCard({
        cardTop: rect.top,
        cardHeight: rect.height,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        insets: fixedNavInsets()
      }),
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    })
  }

  const toggleDay = (dayId: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayId)) {
        next.delete(dayId)
      } else {
        next.add(dayId)
      }
      return next
    })
  }

  // Built once: the form re-applies defaultValues while untouched, and fresh
  // draft ids on every render would reset it each time, looping forever
  const [defaultValues] = useState(() => ({
    programName: existingProgram?.program_name ?? '',
    days: existingProgram ? draftsFromProgram(existingProgram) : [newDay([])]
  }))

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const program: ProgramStruct = {
        program_name: value.programName.trim(),
        program_structure: [...value.days].sort(byWeekday).map((day) => ({
          day: day.day,
          focus: day.focus.trim(),
          exercises: day.exercises.map((exercise) => ({
            name: exercise.name.trim(),
            sets: Number(exercise.sets),
            reps: Number(exercise.reps),
            exercise_tip: exercise.exerciseTip
          }))
        }))
      }

      setSaveStatus('saving')
      try {
        if (existingProgram) {
          await updateProgram(existingProgram.id, program)
        } else {
          await programImport(program)
        }
        dispatch(protectedApiSlice.util.invalidateTags(['Profile']))
        if (existingProgram) {
          toast({
            variant: 'success',
            title: 'Program updated',
            description: `Your changes to ${program.program_name} are saved.`
          })
        }
        navigate({ to: '/training' })
      } catch (error) {
        console.error(error)
        setSaveStatus('error')
      }
    },
    onSubmitInvalid: () => {
      setCollapsedDays(new Set())
      toast({
        variant: 'error',
        title: 'Can’t save yet',
        description: 'Fix the fields marked in red, then try again.'
      })
    }
  })

  const usedDays = useStore(form.store, (state) =>
    state.values.days.map((day) => day.day)
  )

  const dayOrder = useStore(form.store, (state) =>
    sortedDayIds(state.values.days).join(',')
  )

  // With reduced motion there's no layout animation to wait for, so follow right away
  useEffect(() => {
    if (!prefersReducedMotion || !followDayId.current) return
    scrollToDay(followDayId.current)
    followDayId.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOrder, prefersReducedMotion])

  // Indexes of days with a field error, joined into a string so the store
  // only re-renders when the set of failing days actually changes
  const daysWithErrors = useStore(form.store, (state) => {
    const indexes = new Set<number>()
    for (const [name, meta] of Object.entries(state.fieldMeta)) {
      const match = name.match(/^days\[(\d+)\]\./)
      if (match && meta && meta.errors.length > 0) indexes.add(Number(match[1]))
    }
    return [...indexes].sort((a, b) => a - b).join(',')
  })
    .split(',')
    .filter(Boolean)
    .map(Number)

  const [baseline] = useState(() =>
    isEditing ? programBaseline(defaultValues.days) : null
  )
  const programName = useStore(form.store, (state) => state.values.programName)
  const days = useStore(form.store, (state) => state.values.days)
  const edits = useMemo(
    () => (baseline ? findProgramEdits(baseline, days) : null),
    [baseline, days]
  )
  const programNameEdited =
    isEditing && textChanged(programName, defaultValues.programName)
  const fieldEdited = (id: string, field: EditableField) =>
    edits?.editedFields.has(fieldKey(id, field)) ?? false
  const editedMarkId = (id: string, field: EditableField) =>
    `${fieldKey(id, field)}-edited`
  const editedFieldMark = (id: string, field: EditableField) =>
    fieldEdited(id, field) && (
      <EditedMark id={editedMarkId(id, field)} label="Edited" />
    )
  const editedDescription = (id: string, field: EditableField) =>
    fieldEdited(id, field) ? editedMarkId(id, field) : undefined

  const backLink = (
    <Link
      to="/training"
      className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-neutral-400 outline-none transition-colors duration-150 hover:text-app-colors-300 focus-visible:ring-1 focus-visible:ring-app-colors-300"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Training
    </Link>
  )

  return (
    <MotionConfig reducedMotion="user">
      <section className="w-full max-w-3xl">
        {isEditing ? (
          <>
            <div ref={sentinelRef} aria-hidden />
            <header className="pointer-events-none sticky top-0 z-30 pb-3 pt-[max(env(safe-area-inset-top),1rem)] min-[800px]:static min-[800px]:pt-4 [&_a]:pointer-events-auto">
              <div
                aria-hidden
                className={clsx(
                  'pointer-events-none absolute -inset-x-4 top-0 -z-10 h-[calc(max(env(safe-area-inset-top),1rem)+5rem)] border-b border-neutral-800/80 bg-app-colors-500/95 transition-opacity duration-200 ease-out-strong supports-[backdrop-filter]:bg-app-colors-500/80 supports-[backdrop-filter]:backdrop-blur-xl sm:-inset-x-8 min-[800px]:hidden',
                  isStuck ? 'opacity-100' : 'opacity-0'
                )}
              />
              {backLink}
              <h1
                className={clsx(
                  'mt-3 origin-top-left font-display text-3xl font-bold leading-tight text-neutral-50 transition-transform duration-200 ease-out-strong motion-reduce:transition-none sm:text-4xl',
                  isStuck && '-translate-y-2 scale-[0.65]'
                )}
              >
                Edit program
              </h1>
            </header>
            <p
              className={clsx(
                '-mt-2 mb-8 text-sm text-neutral-400 transition-[opacity,transform] duration-200 ease-out-strong motion-reduce:transform-none',
                isStuck && '-translate-y-1 opacity-0'
              )}
            >
              Change your training days and the exercises for each one.
            </p>
          </>
        ) : (
          <header className="pb-8">
            {backLink}
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-neutral-50 sm:text-4xl">
              Build a program
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Set your training days, then add the exercises for each one.
            </p>
          </header>
        )}

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4 sm:gap-6"
        >
          <form.Field
            name="programName"
            validators={{
              onChange: ({ value }) =>
                requiredText('Name', MAX_PROGRAM_NAME_LENGTH)(value)
            }}
          >
            {(field) => (
              <div className={clsx(panelClass, 'grid gap-2 px-4 py-4 sm:px-6')}>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor={field.name} className="text-neutral-50">
                    Program name
                  </Label>
                  {programNameEdited && (
                    <EditedMark id="programName-edited" label="Edited" />
                  )}
                </div>
                <Input
                  id={field.name}
                  aria-describedby={
                    programNameEdited ? 'programName-edited' : undefined
                  }
                  placeholder="Upper / Lower Split"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  className={inputClass(field.state.meta.errors.length > 0)}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="days" mode="array">
            {(daysField) => (
              <>
                {daysField.state.value
                  .map((day, dayIndex) => ({ day, dayIndex }))
                  .sort((a, b) => byWeekday(a.day, b.day))
                  .map(({ day, dayIndex }) => {
                    const canCollapse = daysField.state.value.length > 1
                    const isCollapsed = canCollapse && collapsedDays.has(day.id)
                    const showHiddenError =
                      isCollapsed && daysWithErrors.includes(dayIndex)
                    const isNewDay = edits?.newDays.has(day.id) ?? false
                    const showHiddenEdit =
                      isCollapsed && (edits?.editedDays.has(day.id) ?? false)
                    const weekdayMarked = isNewDay || fieldEdited(day.id, 'day')
                    return (
                      <motion.div
                        key={day.id}
                        layout="position"
                        layoutDependency={dayOrder}
                        transition={{ layout: reorderTransition }}
                        ref={(node: HTMLDivElement | null) => {
                          if (node) cardRefs.current.set(day.id, node)
                          else cardRefs.current.delete(day.id)
                        }}
                        onLayoutAnimationComplete={() => {
                          if (followDayId.current !== day.id) return
                          followDayId.current = null
                          scrollToDay(day.id)
                        }}
                      >
                        <div
                          className={cn(
                            panelClass,
                            enterClass,
                            'transition-colors duration-200',
                            // An error outranks an edit; the user has to fix it to save
                            showHiddenError
                              ? 'border-red-500'
                              : showHiddenEdit && 'border-app-colors-300'
                          )}
                          aria-label={[
                            day.day,
                            showHiddenEdit && 'edited',
                            showHiddenError && 'has errors'
                          ]
                            .filter(Boolean)
                            .join(', ')}
                          role="group"
                        >
                          <div
                            className={clsx(
                              panelHeaderClass,
                              'transition-colors duration-200',
                              isCollapsed && '!border-b-transparent'
                            )}
                          >
                            <form.Field
                              key={`days[${dayIndex}].day`}
                              name={`days[${dayIndex}].day`}
                            >
                              {(field) => (
                                <div className="flex items-center gap-1.5">
                                  <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger
                                      data-day-trigger
                                      aria-label={`Training day: ${field.state.value}. Change day of the week`}
                                      aria-describedby={
                                        weekdayMarked
                                          ? editedMarkId(day.id, 'day')
                                          : undefined
                                      }
                                      className="group -ml-2 inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-base font-semibold text-neutral-50 outline-none transition-colors duration-150 hover:bg-neutral-800/70 focus-visible:ring-1 focus-visible:ring-app-colors-300 [&_svg]:size-4"
                                    >
                                      {field.state.value}
                                      <ChevronDown
                                        aria-hidden
                                        className="text-neutral-400 transition-transform duration-200 ease-out-strong group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                                      />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      side="bottom"
                                      align="start"
                                      sideOffset={6}
                                      collisionPadding={menuCollisionPadding}
                                      className={clsx('w-48', menuContentClass)}
                                      onCloseAutoFocus={(e) => {
                                        e.preventDefault()
                                        cardRefs.current
                                          .get(day.id)
                                          ?.querySelector<HTMLElement>(
                                            '[data-day-trigger]'
                                          )
                                          ?.focus({ preventScroll: true })
                                      }}
                                    >
                                      <DropdownMenuRadioGroup
                                        value={field.state.value}
                                        onValueChange={(weekday) => {
                                          if (
                                            changesPosition(
                                              daysField.state.value,
                                              day.id,
                                              weekday
                                            )
                                          ) {
                                            followDayId.current = day.id
                                          }
                                          field.handleChange(weekday)
                                        }}
                                      >
                                        {WEEKDAYS.map((weekday) => {
                                          const isTaken =
                                            weekday !== field.state.value &&
                                            usedDays.includes(weekday)
                                          return (
                                            <DropdownMenuRadioItem
                                              key={weekday}
                                              value={weekday}
                                              disabled={isTaken}
                                              className={clsx(
                                                menuItemClass,
                                                'items-center justify-between py-2 pl-3 data-[state=checked]:text-app-colors-300 data-[disabled]:opacity-40 [&>span:first-child]:hidden'
                                              )}
                                            >
                                              {weekday}
                                              {isTaken && (
                                                <span className="text-xs text-neutral-500">
                                                  Scheduled
                                                </span>
                                              )}
                                              {weekday ===
                                                field.state.value && (
                                                <Check aria-hidden />
                                              )}
                                            </DropdownMenuRadioItem>
                                          )
                                        })}
                                      </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  {weekdayMarked && (
                                    <EditedMark
                                      id={editedMarkId(day.id, 'day')}
                                      label={isNewDay ? 'New day' : 'Edited'}
                                    />
                                  )}
                                </div>
                              )}
                            </form.Field>
                            {canCollapse && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  className={iconButtonClass}
                                  aria-expanded={!isCollapsed}
                                  aria-controls={`${day.id}-body`}
                                  aria-label={`${
                                    isCollapsed ? 'Expand' : 'Collapse'
                                  } ${day.day}`}
                                  title={
                                    isCollapsed ? 'Expand day' : 'Collapse day'
                                  }
                                  onClick={() => toggleDay(day.id)}
                                >
                                  <ChevronUp
                                    aria-hidden
                                    className={clsx(
                                      'transition-transform duration-200 ease-out-strong motion-reduce:transition-none',
                                      isCollapsed && 'rotate-180'
                                    )}
                                  />
                                </button>
                                <button
                                  type="button"
                                  className={iconButtonClass}
                                  aria-label={`Remove ${day.day}`}
                                  title="Remove day"
                                  onClick={() => {
                                    setCollapsedDays((prev) => {
                                      const next = new Set(prev)
                                      next.delete(day.id)
                                      return next
                                    })
                                    daysField.removeValue(dayIndex)
                                  }}
                                >
                                  <Trash2 aria-hidden />
                                </button>
                              </div>
                            )}
                          </div>

                          <div
                            id={`${day.id}-body`}
                            inert={isCollapsed}
                            className={clsx(
                              'grid transition-[grid-template-rows] duration-200 ease-out-strong motion-reduce:transition-none',
                              isCollapsed
                                ? 'grid-rows-[0fr]'
                                : 'grid-rows-[1fr]'
                            )}
                          >
                            <div
                              className={clsx(
                                'min-h-0 overflow-hidden transition-opacity duration-150 motion-reduce:transition-none',
                                isCollapsed ? 'opacity-0' : 'opacity-100'
                              )}
                            >
                              <div className="px-4 py-4 sm:px-6">
                                <form.Field
                                  key={`days[${dayIndex}].focus`}
                                  name={`days[${dayIndex}].focus`}
                                  validators={{
                                    onChange: ({ value }) =>
                                      requiredText(
                                        'Focus',
                                        MAX_FOCUS_LENGTH
                                      )(value)
                                  }}
                                >
                                  {(field) => (
                                    <div className="grid gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <Label htmlFor={`${day.id}-focus`}>
                                          Focus
                                        </Label>
                                        {editedFieldMark(day.id, 'focus')}
                                      </div>
                                      <Input
                                        id={`${day.id}-focus`}
                                        aria-describedby={editedDescription(
                                          day.id,
                                          'focus'
                                        )}
                                        placeholder="Push, Legs, Full Body..."
                                        value={field.state.value}
                                        onChange={(e) =>
                                          field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                        aria-invalid={
                                          field.state.meta.errors.length > 0
                                        }
                                        className={inputClass(
                                          field.state.meta.errors.length > 0
                                        )}
                                      />
                                      <FieldError
                                        errors={field.state.meta.errors}
                                      />
                                    </div>
                                  )}
                                </form.Field>
                              </div>

                              <form.Field
                                key={`days[${dayIndex}].exercises`}
                                name={`days[${dayIndex}].exercises`}
                                mode="array"
                              >
                                {(exercisesField) => (
                                  <div className="border-t border-neutral-800 px-4 py-4 sm:px-6">
                                    <h3 className="text-sm font-semibold text-neutral-300">
                                      Exercises
                                    </h3>
                                    <ul className="mt-3 flex flex-col gap-4">
                                      {exercisesField.state.value.map(
                                        (exercise, exerciseIndex) => {
                                          const isNewExercise =
                                            edits?.newExercises.has(
                                              exercise.id
                                            ) ?? false
                                          return (
                                            <li
                                              key={exercise.id}
                                              className={clsx(
                                                enterClass,
                                                'grid grid-cols-[1fr_1fr_auto] items-start gap-x-2 gap-y-3 rounded-md border border-neutral-800 p-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_auto] sm:border-0 sm:p-0'
                                              )}
                                            >
                                              <form.Field
                                                key={`days[${dayIndex}].exercises[${exerciseIndex}].name`}
                                                name={`days[${dayIndex}].exercises[${exerciseIndex}].name`}
                                                validators={{
                                                  onChange: ({ value }) =>
                                                    requiredText(
                                                      'Exercise name',
                                                      MAX_EXERCISE_NAME_LENGTH
                                                    )(value)
                                                }}
                                              >
                                                {(field) => (
                                                  <div className="col-span-2 row-start-1 grid gap-2 sm:col-span-1">
                                                    <div className="flex items-center gap-1.5">
                                                      <Label
                                                        htmlFor={`${exercise.id}-name`}
                                                        className="text-neutral-400"
                                                      >
                                                        Exercise Name
                                                      </Label>
                                                      {isNewExercise && (
                                                        <EditedMark
                                                          id={`${exercise.id}-new`}
                                                          label="New exercise"
                                                        />
                                                      )}
                                                      {editedFieldMark(
                                                        exercise.id,
                                                        'name'
                                                      )}
                                                    </div>
                                                    <Input
                                                      id={`${exercise.id}-name`}
                                                      aria-describedby={
                                                        isNewExercise
                                                          ? `${exercise.id}-new`
                                                          : editedDescription(
                                                              exercise.id,
                                                              'name'
                                                            )
                                                      }
                                                      placeholder="Bench Press"
                                                      value={field.state.value}
                                                      onChange={(e) =>
                                                        field.handleChange(
                                                          e.target.value
                                                        )
                                                      }
                                                      onBlur={field.handleBlur}
                                                      aria-invalid={
                                                        field.state.meta.errors
                                                          .length > 0
                                                      }
                                                      className={inputClass(
                                                        field.state.meta.errors
                                                          .length > 0
                                                      )}
                                                    />
                                                    <FieldError
                                                      errors={
                                                        field.state.meta.errors
                                                      }
                                                    />
                                                  </div>
                                                )}
                                              </form.Field>
                                              <form.Field
                                                key={`days[${dayIndex}].exercises[${exerciseIndex}].sets`}
                                                name={`days[${dayIndex}].exercises[${exerciseIndex}].sets`}
                                                validators={{
                                                  onChange: ({ value }) =>
                                                    validateCount('Sets')(value)
                                                }}
                                              >
                                                {(field) => (
                                                  <div className="col-start-1 row-start-2 grid gap-2 sm:col-start-2 sm:row-start-1">
                                                    <div className="flex items-center gap-1.5">
                                                      <Label
                                                        htmlFor={`${exercise.id}-sets`}
                                                        className="text-neutral-400"
                                                      >
                                                        Sets
                                                      </Label>
                                                      {editedFieldMark(
                                                        exercise.id,
                                                        'sets'
                                                      )}
                                                    </div>
                                                    <Input
                                                      id={`${exercise.id}-sets`}
                                                      aria-describedby={editedDescription(
                                                        exercise.id,
                                                        'sets'
                                                      )}
                                                      type="number"
                                                      inputMode="numeric"
                                                      min={1}
                                                      max={MAX_SETS_OR_REPS}
                                                      value={field.state.value}
                                                      onChange={(e) =>
                                                        field.handleChange(
                                                          e.target.value
                                                        )
                                                      }
                                                      onBlur={field.handleBlur}
                                                      aria-invalid={
                                                        field.state.meta.errors
                                                          .length > 0
                                                      }
                                                      className={inputClass(
                                                        field.state.meta.errors
                                                          .length > 0
                                                      )}
                                                    />
                                                    <FieldError
                                                      errors={
                                                        field.state.meta.errors
                                                      }
                                                    />
                                                  </div>
                                                )}
                                              </form.Field>
                                              <form.Field
                                                key={`days[${dayIndex}].exercises[${exerciseIndex}].reps`}
                                                name={`days[${dayIndex}].exercises[${exerciseIndex}].reps`}
                                                validators={{
                                                  onChange: ({ value }) =>
                                                    validateCount('Reps')(value)
                                                }}
                                              >
                                                {(field) => (
                                                  <div className="col-start-2 row-start-2 grid gap-2 sm:col-start-3 sm:row-start-1">
                                                    <div className="flex items-center gap-1.5">
                                                      <Label
                                                        htmlFor={`${exercise.id}-reps`}
                                                        className="text-neutral-400"
                                                      >
                                                        Reps
                                                      </Label>
                                                      {editedFieldMark(
                                                        exercise.id,
                                                        'reps'
                                                      )}
                                                    </div>
                                                    <Input
                                                      id={`${exercise.id}-reps`}
                                                      aria-describedby={editedDescription(
                                                        exercise.id,
                                                        'reps'
                                                      )}
                                                      type="number"
                                                      inputMode="numeric"
                                                      min={1}
                                                      max={MAX_SETS_OR_REPS}
                                                      value={field.state.value}
                                                      onChange={(e) =>
                                                        field.handleChange(
                                                          e.target.value
                                                        )
                                                      }
                                                      onBlur={field.handleBlur}
                                                      aria-invalid={
                                                        field.state.meta.errors
                                                          .length > 0
                                                      }
                                                      className={inputClass(
                                                        field.state.meta.errors
                                                          .length > 0
                                                      )}
                                                    />
                                                    <FieldError
                                                      errors={
                                                        field.state.meta.errors
                                                      }
                                                    />
                                                  </div>
                                                )}
                                              </form.Field>

                                              <button
                                                type="button"
                                                className={clsx(
                                                  iconButtonClass,
                                                  'col-start-3 row-start-1 mt-[1.625rem] sm:col-start-4'
                                                )}
                                                aria-label={`Remove exercise ${
                                                  exerciseIndex + 1
                                                } from ${day.day}`}
                                                title="Remove exercise"
                                                disabled={
                                                  exercisesField.state.value
                                                    .length === 1
                                                }
                                                onClick={() =>
                                                  exercisesField.removeValue(
                                                    exerciseIndex
                                                  )
                                                }
                                              >
                                                <Trash2 aria-hidden />
                                              </button>
                                            </li>
                                          )
                                        }
                                      )}
                                    </ul>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="mt-3 h-10 gap-2 px-3 text-sm font-medium text-app-colors-300 hover:bg-neutral-800/70 hover:text-app-colors-300 [&_svg]:size-4"
                                      disabled={
                                        exercisesField.state.value.length >=
                                        MAX_EXERCISES_PER_DAY
                                      }
                                      onClick={() =>
                                        exercisesField.pushValue(newExercise())
                                      }
                                    >
                                      <Plus aria-hidden />
                                      {exercisesField.state.value.length >=
                                      MAX_EXERCISES_PER_DAY
                                        ? `${MAX_EXERCISES_PER_DAY} exercise limit reached`
                                        : 'Add exercise'}
                                    </Button>
                                  </div>
                                )}
                              </form.Field>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}

                <Button
                  type="button"
                  variant="outline"
                  className={clsx(secondaryButtonClass, 'self-start')}
                  disabled={daysField.state.value.length >= WEEKDAYS.length}
                  onClick={() => daysField.pushValue(newDay(usedDays))}
                >
                  <Plus aria-hidden />
                  {daysField.state.value.length >= WEEKDAYS.length
                    ? 'Every day is scheduled'
                    : 'Add day'}
                </Button>
              </>
            )}
          </form.Field>

          <div
            className={clsx(
              isEditing
                ? 'fixed inset-x-0 bottom-[calc(61px+max(env(safe-area-inset-bottom),0.5rem))] z-40 flex flex-col gap-2 border-t border-neutral-800/80 bg-app-colors-500/95 px-4 py-3 supports-[backdrop-filter]:bg-app-colors-500/80 supports-[backdrop-filter]:backdrop-blur-xl min-[800px]:static min-[800px]:mt-4 min-[800px]:flex-row min-[800px]:items-center min-[800px]:justify-between min-[800px]:gap-4 min-[800px]:rounded-lg min-[800px]:border min-[800px]:border-neutral-800 min-[800px]:bg-[#141414] min-[800px]:px-6 min-[800px]:py-5 min-[800px]:backdrop-blur-none'
                : clsx(
                    panelClass,
                    'mt-4 flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6'
                  )
            )}
          >
            <div
              className={clsx(
                'min-w-0',
                isEditing &&
                  saveStatus !== 'error' &&
                  'hidden min-[800px]:block'
              )}
              aria-live="polite"
            >
              <p
                className={clsx(
                  'text-base font-semibold text-neutral-50',
                  isEditing && 'hidden min-[800px]:block'
                )}
              >
                {isEditing ? 'Save your changes' : 'Save this program'}
              </p>
              {saveStatus === 'error' ? (
                <p
                  role="alert"
                  className={clsx(
                    'text-sm text-red-400',
                    isEditing ? 'min-[800px]:mt-1' : 'mt-1'
                  )}
                >
                  We couldn&rsquo;t save it. Check your connection and try
                  again.
                </p>
              ) : (
                <p className="mt-1 text-sm leading-snug text-neutral-400">
                  {isEditing
                    ? 'The updated program replaces the saved one in Training.'
                    : 'It goes to Training, where you can set it as active.'}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className={clsx(
                primaryButtonClass,
                'h-11 w-full disabled:opacity-100',
                isEditing
                  ? 'min-[800px]:h-10 min-[800px]:w-auto min-[800px]:min-w-[9.5rem]'
                  : 'sm:h-10 sm:w-auto sm:min-w-[9.5rem]'
              )}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Spinner aria-hidden />
                  Saving...
                </>
              ) : (
                <>
                  {isEditing ? 'Save changes' : 'Save program'}
                  <ArrowRight aria-hidden />
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </MotionConfig>
  )
}
