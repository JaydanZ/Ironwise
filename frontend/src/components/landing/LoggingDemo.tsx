import { useState } from 'react'
import clsx from 'clsx'
import { PREVIEW_PREVIOUS_SETS } from '@/data/landingData'

type Unit = 'kg' | 'lb'

interface DemoSet {
  reps: string
  weight: string
}

const KG_TO_LB = 2.20462

const toUnit = (kg: number, unit: Unit) =>
  unit === 'kg' ? kg : Math.round((kg * KG_TO_LB) / 2.5) * 2.5

const formatNumber = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 1 })

const gridClass =
  'grid grid-cols-[1.75rem_minmax(0,1fr)_3.75rem_4.75rem] items-center gap-x-2 sm:grid-cols-[2rem_minmax(0,1fr)_4.5rem_5.5rem] sm:gap-x-3'

const inputClass =
  'h-10 w-full min-w-0 rounded-md border border-neutral-800 bg-neutral-900/70 px-2 text-center text-base tabular-nums text-neutral-50 outline-none transition-[border-color,background-color] duration-150 ease-out placeholder:text-neutral-500 hover:border-neutral-700 focus:border-app-colors-300/70 focus:bg-neutral-900'

const isComplete = (set: DemoSet) =>
  Number(set.reps) > 0 && Number(set.weight) > 0

export const LoggingDemo = () => {
  const [unit, setUnit] = useState<Unit>('kg')
  const [sets, setSets] = useState<DemoSet[]>([
    { reps: '7', weight: '80' },
    { reps: '', weight: '' },
    { reps: '', weight: '' },
    { reps: '', weight: '' }
  ])

  const updateSet = (index: number, field: keyof DemoSet, value: string) =>
    setSets((current) =>
      current.map((set, setIndex) =>
        setIndex === index ? { ...set, [field]: value } : set
      )
    )

  const switchUnit = (next: Unit) => {
    if (next === unit) return
    // Typed weights convert with the unit so the volume stays honest
    setSets((current) =>
      current.map((set) => {
        const weight = Number(set.weight)
        if (!weight) return set
        const converted =
          next === 'lb' ? weight * KG_TO_LB : weight / KG_TO_LB
        return { ...set, weight: String(Math.round(converted * 2) / 2) }
      })
    )
    setUnit(next)
  }

  const volume = sets
    .filter(isComplete)
    .reduce((total, set) => total + Number(set.reps) * Number(set.weight), 0)
  const loggedCount = sets.filter(isComplete).length

  return (
    <div className="rounded-lg border border-neutral-800 bg-[#141414] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-800 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium leading-snug text-neutral-50">
            Barbell Bench Press
          </p>
          <p className="mt-0.5 truncate text-sm tabular-nums text-neutral-400">
            4 &times; 6
            <span aria-hidden className="px-1.5 text-neutral-600">
              /
            </span>
            <span className="text-neutral-300">
              Last {formatNumber(toUnit(80, unit))} {unit} &times; 6
            </span>
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Weight unit"
          className="flex shrink-0 rounded-md border border-neutral-800 p-0.5"
        >
          {(['kg', 'lb'] as Unit[]).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={unit === option}
              onClick={() => switchUnit(option)}
              className={clsx(
                'h-8 rounded-[5px] px-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-app-colors-300',
                unit === option
                  ? 'bg-neutral-800 text-neutral-50'
                  : 'text-neutral-400 hover:text-neutral-200'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-2 pt-3 sm:px-6">
        <div
          aria-hidden
          className={clsx(
            gridClass,
            'border-b border-neutral-800 pb-2 text-xs font-medium text-neutral-500'
          )}
        >
          <span>Set</span>
          <span>
            Previous <span className="font-normal text-neutral-600">(Oct 16)</span>
          </span>
          <span className="text-center">Reps</span>
          <span className="text-center">Weight</span>
        </div>

        <ol>
          {sets.map((set, index) => {
            const previous = PREVIEW_PREVIOUS_SETS[index]
            const previousWeight = toUnit(previous.weight, unit)
            const previousText = `${formatNumber(previousWeight)} ${unit} × ${previous.reps}`
            const label = `Set ${index + 1}`
            return (
              <li key={index} className={clsx(gridClass, 'py-2.5')}>
                <span
                  aria-hidden
                  className={clsx(
                    'flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-200',
                    isComplete(set)
                      ? 'bg-app-colors-300 text-app-colors-500'
                      : 'bg-neutral-800 text-neutral-400'
                  )}
                >
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    updateSet(index, 'reps', String(previous.reps))
                    updateSet(index, 'weight', String(previousWeight))
                  }}
                  aria-label={`Use last session for ${label}: ${previousText}`}
                  title="Use last session"
                  className="-ml-1.5 min-w-0 justify-self-start truncate rounded px-1.5 py-1 text-left text-sm tabular-nums text-neutral-300 outline-none transition-[color,transform] duration-150 ease-out hover:text-app-colors-300 focus-visible:ring-1 focus-visible:ring-app-colors-300 active:scale-[0.97]"
                >
                  {previousText}
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`${label} reps`}
                  placeholder={String(previous.reps)}
                  value={set.reps}
                  onChange={(event) =>
                    updateSet(index, 'reps', event.target.value)
                  }
                  className={inputClass}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={`${label} weight in ${unit}`}
                  placeholder={unit}
                  value={set.weight}
                  onChange={(event) =>
                    updateSet(index, 'weight', event.target.value)
                  }
                  className={inputClass}
                />
              </li>
            )
          })}
        </ol>
      </div>

      <div className="flex items-baseline justify-between gap-4 border-t border-neutral-800 px-4 py-4 sm:px-6">
        <p className="text-sm text-neutral-400">
          {loggedCount} of {sets.length} sets logged
        </p>
        <p className="text-sm text-neutral-400" aria-live="polite">
          Volume{' '}
          <span className="font-display text-xl font-bold tabular-nums text-neutral-50">
            {formatNumber(volume)}
          </span>{' '}
          {unit}
        </p>
      </div>
    </div>
  )
}
