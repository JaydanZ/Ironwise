import clsx from 'clsx'
import { WeightUnit } from '@/types/workoutSession'

const UNITS: WeightUnit[] = ['lb', 'kg']

export const UnitToggle = ({
  unit,
  onChange
}: {
  unit: WeightUnit
  onChange: (unit: WeightUnit) => void
}) => (
  <div
    role="radiogroup"
    aria-label="Weight unit"
    className="inline-flex h-9 shrink-0 rounded-md border border-neutral-800 bg-neutral-900/70 p-0.5"
  >
    {UNITS.map((option) => {
      const selected = option === unit
      return (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(option)}
          className={clsx(
            'min-w-11 rounded-[5px] px-3 text-sm font-medium outline-none transition-[color,background-color,transform] duration-150 ease-out focus-visible:ring-1 focus-visible:ring-app-colors-300 active:scale-[0.97]',
            selected
              ? 'bg-neutral-700/80 text-neutral-50'
              : 'text-neutral-400 hover:text-neutral-200'
          )}
        >
          {option}
        </button>
      )
    })}
  </div>
)
