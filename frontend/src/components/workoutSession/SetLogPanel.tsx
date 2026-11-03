import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, Minus, Plus } from 'lucide-react'
import { WeightUnit } from '@/types/workoutSession'
import { sanitizeReps, sanitizeWeight } from '@/hooks/useWorkoutSession'
import { Button } from '@/components/ui/button'
import { primaryButtonClass } from '../profile/profileStyles'
import { PanelValues, stepReps, stepWeight } from './sessionNavigation'
import { sessionLogPanelClass } from './sessionStyles'
import { UnitToggle } from './UnitToggle'

interface SetLogPanelProps {
  resetKey: string
  setNumber: number
  totalSets: number
  seed: PanelValues
  unit: WeightUnit
  lastText: string | null
  showSubmit: boolean
  showFinishEarly: boolean
  canFinishEarly: boolean
  isSubmitting: boolean
  errorMessage: string | null
  onUnitChange: (unit: WeightUnit) => void
  onFinishEarly: () => void
  onDone: (values: PanelValues) => void
  onSubmit: () => void
}

const valueInputClass =
  'h-12 w-full min-w-0 bg-transparent text-center text-4xl font-bold tabular-nums text-app-colors-300 outline-none placeholder:text-neutral-600 focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-4'

const stepperClass =
  'inline-flex h-12 min-w-0 flex-1 items-center justify-center rounded-full bg-neutral-800 text-neutral-100 outline-none transition-[transform,background-color] duration-150 ease-out-strong hover:bg-neutral-700 focus-visible:ring-1 focus-visible:ring-app-colors-300 active:scale-[0.94] motion-reduce:active:scale-100 [&_svg]:size-5'

const Stepper = ({
  label,
  onDecrease,
  onIncrease
}: {
  label: string
  onDecrease: () => void
  onIncrease: () => void
}) => (
  <div className="flex flex-1 gap-2">
    <button
      type="button"
      aria-label={`Decrease ${label}`}
      onClick={onDecrease}
      className={stepperClass}
    >
      <Minus aria-hidden />
    </button>
    <button
      type="button"
      aria-label={`Increase ${label}`}
      onClick={onIncrease}
      className={stepperClass}
    >
      <Plus aria-hidden />
    </button>
  </div>
)

export const SetLogPanel = ({
  resetKey,
  setNumber,
  totalSets,
  seed,
  unit,
  lastText,
  showSubmit,
  showFinishEarly,
  canFinishEarly,
  isSubmitting,
  errorMessage,
  onUnitChange,
  onFinishEarly,
  onDone,
  onSubmit
}: SetLogPanelProps) => {
  const { weight: seedWeight, reps: seedReps } = seed
  const [values, setValues] = useState<PanelValues>(seed)
  const [edited, setEdited] = useState(false)
  const [seededFor, setSeededFor] = useState(resetKey)
  const submitButton = useRef<HTMLButtonElement>(null)
  const donePressed = useRef(false)

  // Reset in place rather than by remounting, so focus stays on the done button
  if (seededFor !== resetKey) {
    setSeededFor(resetKey)
    setEdited(false)
    setValues(seed)
  }

  useEffect(() => {
    if (!edited) setValues({ weight: seedWeight, reps: seedReps })
  }, [edited, seedWeight, seedReps])

  useEffect(() => {
    if (showSubmit && donePressed.current) submitButton.current?.focus()
    donePressed.current = false
  }, [showSubmit])

  const edit = (next: Partial<PanelValues>) => {
    setEdited(true)
    setValues((current) => ({ ...current, ...next }))
  }

  return (
    <section
      aria-label="Log set"
      className={sessionLogPanelClass}
    >
      {errorMessage && (
        <p role="alert" className="pb-2 text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <p className="truncate text-sm leading-tight tabular-nums text-neutral-400">
        {showSubmit
          ? 'Every set logged'
          : `Set ${setNumber} of ${totalSets}${lastText ? ` · Last ${lastText}` : ''}`}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <UnitToggle unit={unit} onChange={onUnitChange} />
        {showFinishEarly && (
          <Button
            variant="ghost"
            disabled={!canFinishEarly || isSubmitting}
            onClick={onFinishEarly}
            className="h-9 shrink-0 border border-neutral-700 px-3 text-sm font-medium text-neutral-200 hover:bg-neutral-800/70 hover:text-neutral-50 disabled:opacity-40"
          >
            Finish early
          </Button>
        )}
      </div>

      {showSubmit ? (
        <Button
          ref={submitButton}
          disabled={isSubmitting}
          onClick={onSubmit}
          className={clsx(primaryButtonClass, 'mt-3 h-12 w-full')}
        >
          {isSubmitting ? 'Saving...' : 'Submit workout'}
        </Button>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-center gap-3">
            <div className="text-center">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label={`Weight in ${unit}`}
                placeholder="–"
                value={values.weight}
                onChange={(event) =>
                  edit({ weight: sanitizeWeight(event.target.value) })
                }
                className={valueInputClass}
              />
              <span aria-hidden className="text-xs text-neutral-400">
                {unit}
              </span>
            </div>
            <button
              type="button"
              aria-label="Mark set done"
              disabled={values.reps === ''}
              onClick={() => {
                donePressed.current = true
                onDone(values)
              }}
              className="flex size-[4.5rem] items-center justify-center rounded-full bg-app-colors-300 text-app-colors-500 outline-none transition-transform duration-150 ease-out-strong focus-visible:ring-2 focus-visible:ring-app-colors-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] active:scale-[0.94] disabled:opacity-40 motion-reduce:active:scale-100"
            >
              <Check aria-hidden strokeWidth={3} className="size-8" />
            </button>
            <div className="text-center">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                aria-label="Reps"
                placeholder="–"
                value={values.reps}
                onChange={(event) =>
                  edit({ reps: sanitizeReps(event.target.value) })
                }
                className={valueInputClass}
              />
              <span aria-hidden className="text-xs text-neutral-400">
                reps
              </span>
            </div>
          </div>

          <div className="mt-3 flex gap-6">
            <Stepper
              label="weight"
              onDecrease={() =>
                edit({ weight: stepWeight(values.weight, -1, unit) })
              }
              onIncrease={() =>
                edit({ weight: stepWeight(values.weight, 1, unit) })
              }
            />
            <Stepper
              label="reps"
              onDecrease={() => edit({ reps: stepReps(values.reps, -1) })}
              onIncrease={() => edit({ reps: stepReps(values.reps, 1) })}
            />
          </div>
        </>
      )}
    </section>
  )
}
