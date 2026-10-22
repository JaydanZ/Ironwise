import { useState, useRef, useEffect, useLayoutEffect, Activity } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import clsx from 'clsx'

import { useAsyncDispatch } from '@/store/store'
import { useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import {
  isProgramJobError,
  startAIProgram
} from '@/features/programGeneration/programGenerationSlice'
import { toast } from '@/hooks/use-toast'
import { ProgramOptions } from '@/types/programCreation'

import { ChevronDownIcon, Cog } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
  CardContent,
  CardDescription
} from '../ui/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '../ui/input-group'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '../ui/dropdown-menu'
import { Separator } from '../ui/separator'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'

enum WeightUnits {
  Pounds = 'Lbs',
  Kilograms = 'KGs'
}

enum Section {
  FitnessGoal,
  TrainingStyle,
  WorkoutLocation,
  Experience,
  Frequency,
  AboutYou,
  Summary
}

const MAX_SECTION_NUM = Section.Summary
const MAX_AGE = 120
const MAX_WEIGHT = 900
const sections = [
  {
    sectionName: 'Goal',
    title: 'Fitness Goals',
    description:
      'What fitness goals are you trying to achieve with the program?'
  },
  {
    sectionName: 'Style',
    title: 'Training Style',
    description: 'How do you want to train?'
  },
  {
    sectionName: 'Location',
    title: 'Workout Location',
    description: 'Where will you be working out?'
  },
  {
    sectionName: 'Experience',
    title: 'Years of Experience',
    description: 'How many years of experience do you have working out?'
  },
  {
    sectionName: 'Frequency',
    title: 'Workout Frequency',
    description: 'How many days in a week can you workout?'
  },
  {
    sectionName: 'About You',
    title: 'Age, Weight and Gender',
    description: 'What is your current age, weight and gender?'
  },
  {
    sectionName: 'Summary',
    title: 'Summary',
    description: 'Here are all of the options you selected:'
  }
]
const fitnessGoalList = ['Gain muscle and lose fat', 'Lose fat', 'Gain muscle']
const trainingStyleList = [
  { value: 'Weightlifting', hint: 'Barbells, dumbbells and machines' },
  { value: 'Calisthenics', hint: 'Bodyweight skills and progressions' },
  { value: 'Hybrid', hint: 'A mix of bodyweight and weights' }
]
const workoutLocationList = [
  { value: 'Gym', label: 'Gym' },
  { value: 'Home', label: 'At home' }
]
const BODYWEIGHT_ONLY = 'None'
const homeEquipmentList = [
  'Pull-up bar',
  'Dip bars / rings',
  'Dumbbells',
  'Kettlebells',
  'Resistance bands',
  'Bench',
  'Barbell and rack'
]
const yearsOfExperienceList = [
  'No Experience',
  '0 - 1 Years',
  '2 - 3 Years',
  '3 - 5 Years',
  'Over 5 Years'
]
const daysInWeekList = [
  '1 Day',
  '2 Days',
  '3 Days',
  '4 Days',
  '5 Days',
  '6-7 Days'
]
const genderOptions = ['Male', 'Female']

const optionClass =
  'flex flex-row hover:cursor-pointer justify-between items-center w-full p-4 my-1.5 sm:p-5 sm:my-2 bg-neutral-900 border-2 rounded-lg font-medium select-none [-webkit-tap-highlight-color:transparent] transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.99] motion-reduce:active:scale-100 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-app-colors-300 has-[:checked]:border-app-colors-300 has-[:checked]:text-app-colors-300 has-[:checked]:bg-app-colors-300/5 [@media(hover:hover)]:hover:bg-neutral-800'
const radioClass =
  'ml-3 w-4 h-4 shrink-0 appearance-none rounded-full border-2 border-solid border-neutral-600 bg-neutral-600 transition-colors duration-150 checked:border-app-colors-300 checked:bg-app-colors-300'
const equipmentOptionClass = clsx(
  optionClass,
  'min-h-11 !my-0 !p-3 text-sm sm:!p-4 sm:text-base'
)
const equipmentRevealClass =
  'transition-[opacity,transform] motion-reduce:translate-y-0 motion-reduce:duration-150'
const revealedClass =
  'opacity-100 translate-y-0 duration-[240ms] ease-out-strong'
const concealedClass =
  'opacity-0 -translate-y-2 duration-200 ease-in-out-strong'
const EQUIPMENT_STAGGER_MS = 30
// Two items per grid row, bodyweight-only first
const equipmentRow = (index: number) => Math.floor(index / 2)
const LAST_EQUIPMENT_ROW = equipmentRow(homeEquipmentList.length)
// Rows reveal top-down and hide bottom-up, so closing plays the opening in reverse
const equipmentRevealDelay = (row: number, isOpen: boolean) =>
  `${(isOpen ? row : LAST_EQUIPMENT_ROW - row) * EQUIPMENT_STAGGER_MS}ms`
const checkboxClass =
  'ml-3 w-4 h-4 shrink-0 appearance-none rounded-[4px] border-2 border-solid border-neutral-600 bg-neutral-600 transition-colors duration-150 checked:border-app-colors-300 checked:bg-app-colors-300'

const SECTION_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)'
const COLLAPSE_EASING = 'cubic-bezier(0.77, 0, 0.175, 1)'
const SECTION_DURATION_MS = 240
const SECTION_REDUCED_DURATION_MS = 150
const SECTION_STAGGER_MS = 40
const SECTION_SHIFT_PX = 12

const pressableClass =
  'h-11 min-[800px]:h-10 transition-[transform,background-color] duration-150 ease-out-strong active:scale-[0.97] motion-reduce:active:scale-100'

export const ProgramFactory = () => {
  const [sectionNumber, setSectionNumber] = useState<number>(0)
  const [weightUnit, setWeightUnit] = useState<WeightUnits>(WeightUnits.Pounds)
  const [sectionError, setSectionError] = useState<string>('')
  const cardRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const hasMounted = useRef(false)
  const prevSectionRef = useRef(sectionNumber)
  const prevCardHeightRef = useRef<number | null>(null)
  const sectionAnimationsRef = useRef<Animation[]>([])
  const equipmentPanelRef = useRef<HTMLDivElement>(null)
  const equipmentAnimationRef = useRef<Animation | null>(null)

  const isUserLoggedIn = useSelector(
    (state: RootState) => state.auth.isLoggedIn
  )
  const dispatch = useAsyncDispatch()

  const form = useForm({
    defaultValues: {
      fitnessGoal: '',
      trainingStyle: '',
      workoutLocation: '',
      homeEquipment: [] as string[],
      yearsOfExperience: '',
      numDaysInWeek: '',
      age: '',
      weight: '',
      gender: ''
    },
    onSubmit: async ({ value }) => {
      const formattedAge = parseInt(value.age)
      const formattedWeight = parseInt(value.weight)

      const programInput: ProgramOptions = {
        fitness_goal: value.fitnessGoal,
        training_style: value.trainingStyle,
        workout_location: value.workoutLocation,
        home_equipment:
          value.workoutLocation === 'Home' ? value.homeEquipment : [],
        years_of_experience: value.yearsOfExperience,
        days_per_week: value.numDaysInWeek,
        age: formattedAge,
        weight: formattedWeight,
        weight_unit: weightUnit,
        gender: value.gender,
        isLoggedIn: isUserLoggedIn
      }

      try {
        const result = await dispatch(startAIProgram(programInput))
        if (
          startAIProgram.rejected.match(result) &&
          result.payload?.errorCode !== 429
        ) {
          toast({
            variant: 'error',
            title: isProgramJobError(result.payload)
              ? 'We couldn’t finish your program'
              : 'We couldn’t generate your program',
            description: 'Try again in a moment.'
          })
        }
      } catch (error) {
        console.error(error)
      }
    }
  })

  const formValues = useStore(form.store, (state) => state.values)
  const isHomeWorkout = formValues.workoutLocation === 'Home'
  const summaryRows = [
    {
      label: 'Fitness goal',
      value: formValues.fitnessGoal,
      section: Section.FitnessGoal
    },
    {
      label: 'Training style',
      value: formValues.trainingStyle,
      section: Section.TrainingStyle
    },
    {
      label: 'Location',
      value: workoutLocationList.find(
        (location) => location.value === formValues.workoutLocation
      )?.label,
      section: Section.WorkoutLocation
    },
    ...(isHomeWorkout
      ? [
          {
            label: 'Equipment',
            value: formValues.homeEquipment.join(', '),
            section: Section.WorkoutLocation
          }
        ]
      : []),
    {
      label: 'Years of experience',
      value: formValues.yearsOfExperience,
      section: Section.Experience
    },
    {
      label: 'Days per week',
      value: formValues.numDaysInWeek,
      section: Section.Frequency
    },
    { label: 'Age', value: formValues.age, section: Section.AboutYou },
    {
      label: `Weight (${weightUnit})`,
      value: formValues.weight,
      section: Section.AboutYou
    },
    { label: 'Gender', value: formValues.gender, section: Section.AboutYou }
  ]

  const toggleEquipment = (item: string, isChecked: boolean) => {
    const current = form.getFieldValue('homeEquipment')
    if (!isChecked) {
      form.setFieldValue(
        'homeEquipment',
        current.filter((equipment) => equipment !== item)
      )
    } else if (item === BODYWEIGHT_ONLY) {
      form.setFieldValue('homeEquipment', [BODYWEIGHT_ONLY])
    } else {
      form.setFieldValue('homeEquipment', [
        ...current.filter((equipment) => equipment !== BODYWEIGHT_ONLY),
        item
      ])
    }
  }

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }

    const card = cardRef.current
    if (!card || card.getBoundingClientRect().top >= 0) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    card.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start'
    })
  }, [sectionNumber])

  useLayoutEffect(() => {
    const direction = Math.sign(sectionNumber - prevSectionRef.current)
    prevSectionRef.current = sectionNumber
    if (direction === 0) return

    sectionAnimationsRef.current.forEach((animation) => animation.cancel())
    sectionAnimationsRef.current = []

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const enterFrames: Keyframe[] = reduceMotion
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          {
            opacity: 0,
            transform: `translateX(${direction * SECTION_SHIFT_PX}px)`
          },
          { opacity: 1, transform: 'translateX(0)' }
        ]

    ;[headerRef.current, formRef.current].forEach((element, index) => {
      if (!element) return
      sectionAnimationsRef.current.push(
        element.animate(enterFrames, {
          duration: reduceMotion
            ? SECTION_REDUCED_DURATION_MS
            : SECTION_DURATION_MS,
          delay: reduceMotion ? 0 : index * SECTION_STAGGER_MS,
          easing: SECTION_EASING,
          fill: 'backwards'
        })
      )
    })

    const card = cardRef.current
    const fromHeight = prevCardHeightRef.current
    prevCardHeightRef.current = null
    if (reduceMotion || !card || fromHeight === null) return

    const toHeight = card.offsetHeight
    if (Math.abs(toHeight - fromHeight) < 1) return

    card.style.overflow = 'hidden'
    const heightAnimation = card.animate(
      [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
      { duration: SECTION_DURATION_MS, easing: SECTION_EASING }
    )

    const releaseOverflow = () => {
      if (sectionAnimationsRef.current.includes(heightAnimation)) {
        card.style.overflow = ''
      }
    }
    heightAnimation.onfinish = releaseOverflow
    heightAnimation.oncancel = releaseOverflow
    sectionAnimationsRef.current.push(heightAnimation)
  }, [sectionNumber])

  const wasHomeWorkoutRef = useRef(isHomeWorkout)
  useLayoutEffect(() => {
    if (wasHomeWorkoutRef.current === isHomeWorkout) return
    wasHomeWorkoutRef.current = isHomeWorkout

    const panel = equipmentPanelRef.current
    if (!panel) return

    // Mid-animation, the panel still reports its animated height, so an interruption starts from there
    const previous = equipmentAnimationRef.current
    const isInterrupting =
      previous?.playState === 'running' || previous?.playState === 'paused'
    const fromHeight = isInterrupting
      ? panel.getBoundingClientRect().height
      : isHomeWorkout
        ? 0
        : panel.scrollHeight
    previous?.cancel()
    equipmentAnimationRef.current = null

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const toHeight = isHomeWorkout ? panel.scrollHeight : 0
    equipmentAnimationRef.current = panel.animate(
      [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
      isHomeWorkout
        ? { duration: SECTION_DURATION_MS, easing: SECTION_EASING }
        : {
            duration: SECTION_DURATION_MS,
            // Collapses only once the lower rows have faded out
            delay: LAST_EQUIPMENT_ROW * EQUIPMENT_STAGGER_MS,
            easing: COLLAPSE_EASING,
            fill: 'backwards'
          }
    )
  }, [isHomeWorkout])

  const goToSection = (nextSection: number) => {
    prevCardHeightRef.current = cardRef.current?.offsetHeight ?? null
    setSectionNumber(nextSection)
  }

  const handleSectionNumChange = (sectionChange: number) => {
    // Before advancing to the next section, we need to manually check if all necessary fields have been filled out in a section
    // Only when user clicks next, ignore if back is clicked

    setSectionError('')

    if (sectionChange > 0) {
      switch (sectionNumber) {
        case Section.FitnessGoal:
          if (form.getFieldValue('fitnessGoal').length === 0) {
            setSectionError('Error: you must select an option')
            return
          }
          break
        case Section.TrainingStyle:
          if (form.getFieldValue('trainingStyle').length === 0) {
            setSectionError('Error: you must select an option')
            return
          }
          break
        case Section.WorkoutLocation:
          if (form.getFieldValue('workoutLocation').length === 0) {
            setSectionError('Error: you must select an option')
            return
          }
          if (
            form.getFieldValue('workoutLocation') === 'Home' &&
            form.getFieldValue('homeEquipment').length === 0
          ) {
            setSectionError('Error: select the equipment you have, or None')
            return
          }
          break
        case Section.Experience:
          if (form.getFieldValue('yearsOfExperience').length === 0) {
            setSectionError('Error: you must select an option')
            return
          }
          break
        case Section.Frequency:
          if (form.getFieldValue('numDaysInWeek').length === 0) {
            setSectionError('Error: you must select an option')
            return
          }
          break
        case Section.AboutYou:
          if (
            form.getFieldValue('age').length === 0 ||
            form.getFieldValue('weight').length === 0 ||
            form.getFieldValue('gender').length === 0
          ) {
            setSectionError('Error: all fields must be filled in / selected')
            return
          }
          break
      }
    }

    if (sectionChange < 0 && sectionNumber > 0) {
      goToSection(sectionNumber - 1)
    } else if (sectionChange > 0 && sectionNumber < MAX_SECTION_NUM) {
      goToSection(sectionNumber + 1)
    }
  }

  return (
    <div className="flex flex-col justify-center items-center w-full min-[800px]:w-auto">
      <Label className="text-4xl leading-tight text-center mb-6 min-[800px]:text-[3rem] min-[800px]:leading-none min-[800px]:mb-8 font-thin">
        Program Generator
      </Label>
      <div className="w-full mb-6">
        <div className="flex flex-row w-full gap-x-1.5 min-[800px]:gap-x-3">
          {sections.map((section, index) => (
            <div
              className="flex flex-1 flex-col items-center min-[800px]:flex-none"
              key={index}
            >
              <Label
                className={clsx(
                  'hidden min-[800px]:block text-[0.8rem] mb-2 transition-colors duration-300',
                  sectionNumber >= index
                    ? 'text-app-colors-300'
                    : 'text-neutral-500'
                )}
              >
                {section.sectionName}
              </Label>
              <div className="relative inline-block w-full min-[800px]:w-[104px] min-h-[4px] rounded-xl overflow-hidden bg-neutral-500">
                <div
                  className={clsx(
                    'absolute inset-0 origin-left bg-app-colors-300 transition-[transform,opacity] duration-300 ease-out-strong motion-reduce:scale-x-100 motion-reduce:transition-opacity motion-reduce:duration-150',
                    sectionNumber >= index
                      ? 'scale-x-100 opacity-100'
                      : 'scale-x-0 opacity-0'
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Card
        ref={cardRef}
        className={clsx(
          'flex flex-col w-full min-h-[480px] min-[800px]:min-h-[550px] justify-between scroll-mt-4 transition-colors duration-200',
          sectionError.length > 0 && 'border-red-500'
        )}
      >
        <CardHeader ref={headerRef} className="p-4 sm:p-6">
          <CardTitle className="text-2xl sm:text-[2rem]">
            <h2>{sections[sectionNumber].title}</h2>
          </CardTitle>
          <CardDescription>
            {sections[sectionNumber].description}
          </CardDescription>
          {sectionError.length > 0 && (
            <Label className="pt-4 pb-1 text-red-500">{sectionError}</Label>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <Activity
              mode={
                sectionNumber === Section.FitnessGoal ? 'visible' : 'hidden'
              }
            >
              <form.Field name="fitnessGoal">
                {(field) => (
                  <div>
                    {fitnessGoalList.map((goal, index) => (
                      <div className="flex items-center gap-3" key={index}>
                        <label className={optionClass}>
                          {goal}
                          <input
                            type="radio"
                            id={goal}
                            value={goal}
                            checked={field.state.value === goal}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className={radioClass}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>
            </Activity>
            <Activity
              mode={
                sectionNumber === Section.TrainingStyle ? 'visible' : 'hidden'
              }
            >
              <form.Field name="trainingStyle">
                {(field) => (
                  <div>
                    {trainingStyleList.map((style) => (
                      <div
                        className="flex items-center gap-3"
                        key={style.value}
                      >
                        <label className={optionClass}>
                          <span className="flex flex-col gap-1">
                            {style.value}
                            <span className="text-sm font-normal text-neutral-400">
                              {style.hint}
                            </span>
                          </span>
                          <input
                            type="radio"
                            id={style.value}
                            value={style.value}
                            aria-label={style.value}
                            checked={field.state.value === style.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className={radioClass}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>
            </Activity>
            <Activity
              mode={
                sectionNumber === Section.WorkoutLocation ? 'visible' : 'hidden'
              }
            >
              <form.Field name="workoutLocation">
                {(field) => (
                  <div className="flex flex-row w-full gap-3 sm:gap-4">
                    {workoutLocationList.map((location) => (
                      <div
                        className="flex items-center w-full"
                        key={location.value}
                      >
                        <label className={optionClass}>
                          {location.label}
                          <input
                            type="radio"
                            id={location.value}
                            value={location.value}
                            checked={field.state.value === location.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className={radioClass}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>
              <div
                ref={equipmentPanelRef}
                aria-hidden={!isHomeWorkout}
                inert={!isHomeWorkout}
                className={clsx(
                  'overflow-hidden -mx-1 px-1 -mb-1 pb-1',
                  isHomeWorkout ? 'h-auto' : 'h-0'
                )}
              >
                <form.Field name="homeEquipment">
                  {(field) => (
                    <fieldset className="pt-5 sm:pt-6">
                      <legend
                        style={{
                          transitionDelay: equipmentRevealDelay(
                            0,
                            isHomeWorkout
                          )
                        }}
                        className={clsx(
                          equipmentRevealClass,
                          'mb-2 text-lg font-medium sm:mb-3',
                          isHomeWorkout ? revealedClass : concealedClass
                        )}
                      >
                        What equipment do you have?
                      </legend>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {[BODYWEIGHT_ONLY, ...homeEquipmentList].map(
                          (item, index) => (
                            <div
                              key={item}
                              style={{
                                transitionDelay: equipmentRevealDelay(
                                  equipmentRow(index),
                                  isHomeWorkout
                                )
                              }}
                              className={clsx(
                                equipmentRevealClass,
                                isHomeWorkout ? revealedClass : concealedClass
                              )}
                            >
                              <label
                                className={clsx(equipmentOptionClass, 'h-full')}
                              >
                                {item}
                                <input
                                  type="checkbox"
                                  value={item}
                                  checked={field.state.value.includes(item)}
                                  onChange={(e) =>
                                    toggleEquipment(item, e.target.checked)
                                  }
                                  className={checkboxClass}
                                />
                              </label>
                            </div>
                          )
                        )}
                      </div>
                    </fieldset>
                  )}
                </form.Field>
              </div>
            </Activity>
            <Activity
              mode={sectionNumber === Section.Experience ? 'visible' : 'hidden'}
            >
              <form.Field name="yearsOfExperience">
                {(field) => (
                  <div>
                    {yearsOfExperienceList.map((years, index) => (
                      <div className="flex items-center gap-3" key={index}>
                        <label className={optionClass}>
                          {years}
                          <input
                            type="radio"
                            id={years}
                            value={years}
                            checked={field.state.value === years}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className={radioClass}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>
            </Activity>
            <Activity
              mode={sectionNumber === Section.Frequency ? 'visible' : 'hidden'}
            >
              <form.Field name="numDaysInWeek">
                {(field) => (
                  <div>
                    {daysInWeekList.map((days, index) => (
                      <div className="flex items-center gap-3" key={index}>
                        <label className={optionClass}>
                          {days}
                          <input
                            type="radio"
                            id={days}
                            value={days}
                            checked={field.state.value === days}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className={radioClass}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </form.Field>
            </Activity>
            <Activity
              mode={sectionNumber === Section.AboutYou ? 'visible' : 'hidden'}
            >
              <div className="flex flex-col gap-6">
                <form.Field
                  name="age"
                  validators={{
                    onChange: ({ value }) => {
                      const formattedAge = parseInt(value)
                      if (formattedAge < 0)
                        return 'Age cannot be a negative number'
                      if (formattedAge > MAX_AGE)
                        return `Age cannot be greater than ${MAX_AGE}`
                      return undefined
                    }
                  }}
                >
                  {(field) => (
                    <div className="grid gap-3">
                      <Label htmlFor={field.name} className="text-lg">
                        Age
                      </Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="25"
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className={clsx(
                          (sectionError.length > 0 &&
                            field.state.value.length === 0) ||
                            (field.state.meta.errors.length > 0 &&
                              'border-red-500 focus-visible:ring-0')
                        )}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-red-500 text-sm">
                          {field.state.meta.errors.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
                <form.Field
                  name="weight"
                  validators={{
                    onChange: ({ value }) => {
                      const formattedWeight = parseInt(value)
                      if (formattedWeight < 0)
                        return 'Weight cannot be a negative number'
                      if (formattedWeight > MAX_WEIGHT)
                        return `Weight cannot be greater than ${MAX_WEIGHT} ${weightUnit}`
                      return undefined
                    }
                  }}
                >
                  {(field) => (
                    <div className="grid gap-3">
                      <Label htmlFor={field.name} className="text-lg">
                        Weight
                      </Label>
                      <InputGroup
                        className={clsx(
                          (sectionError.length > 0 &&
                            field.state.value.length === 0) ||
                            (field.state.meta.errors.length > 0 &&
                              'border-red-500 has-[[data-slot=input-group-control]:focus-visible]:ring-0')
                        )}
                      >
                        <InputGroupInput
                          placeholder="180"
                          type="number"
                          inputMode="numeric"
                          id={field.name}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <InputGroupAddon align="inline-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <InputGroupButton
                                variant="ghost"
                                className="!pr-1.5 text-s"
                              >
                                {weightUnit}{' '}
                                <ChevronDownIcon className="size-1" />
                              </InputGroupButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  setWeightUnit(WeightUnits.Pounds)
                                }
                              >
                                {WeightUnits.Pounds}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setWeightUnit(WeightUnits.Kilograms)
                                }
                              >
                                {WeightUnits.Kilograms}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </InputGroupAddon>
                      </InputGroup>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-red-500 text-sm">
                          {field.state.meta.errors.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
                <form.Field name="gender">
                  {(field) => (
                    <div>
                      <Label htmlFor="gender" className="text-lg">
                        Gender
                      </Label>
                      <div
                        className="flex flex-row w-full justify-between gap-3 sm:gap-4"
                        id="gender"
                      >
                        {genderOptions.map((gender, index) => (
                          <div className="flex items-center w-full" key={index}>
                            <label className={optionClass}>
                              {gender}
                              <input
                                type="radio"
                                id={gender}
                                value={gender}
                                checked={field.state.value === gender}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                className={radioClass}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form.Field>
              </div>
            </Activity>
            <Activity
              mode={sectionNumber === MAX_SECTION_NUM ? 'visible' : 'hidden'}
            >
              <div className="flex flex-col items-center w-full h-full">
                <div className="flex flex-col w-full">
                  {summaryRows.map((row) => (
                    <div
                      className="flex flex-row my-1 gap-4 justify-between items-center"
                      key={row.label}
                      data-summary-row
                    >
                      <Label className="shrink-0 text-base sm:text-[1.1rem] text-neutral-400">
                        {row.label}
                      </Label>
                      <div className="flex flex-row min-w-0 justify-end items-center">
                        <Label className="text-right leading-snug text-base sm:text-[1.1rem]">
                          {row.value}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={`Edit ${row.label.toLowerCase()}`}
                          onClick={() => goToSection(row.section)}
                          className="shrink-0 size-10 -my-2.5 -ml-1 -mr-3 p-0 text-neutral-400 text-xs [-webkit-tap-highlight-color:transparent]"
                        >
                          <Cog className="!size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="default"
                  type="submit"
                  size="lg"
                  className={clsx(pressableClass, 'mt-6 w-full')}
                >
                  Generate Program
                </Button>
              </div>
            </Activity>
          </form>
        </CardContent>
        <Separator className="mt-auto mb-4 sm:mb-6" orientation="horizontal" />
        <CardFooter className="flex flex-col p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-row w-full justify-between">
            {sectionNumber > 0 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => handleSectionNumChange(-1)}
                className={clsx(pressableClass, 'mr-auto')}
              >
                Back
              </Button>
            )}
            {sectionNumber !== MAX_SECTION_NUM && (
              <Button
                variant="default"
                size="lg"
                onClick={() => handleSectionNumChange(+1)}
                className={clsx(pressableClass, 'ml-auto')}
              >
                Next
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
