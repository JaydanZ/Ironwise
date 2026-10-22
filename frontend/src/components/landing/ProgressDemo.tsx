import { useId, useState } from 'react'
import clsx from 'clsx'
import { Trophy } from 'lucide-react'
import { PREVIEW_RECORDS, PREVIEW_TRENDS } from '@/data/landingData'
import useIsMobile from '@/hooks/useIsMobile'

const HEIGHT = 200
const PAD = { top: 20, right: 16, bottom: 28, left: 40 }

const TrendChart = ({ index }: { index: number }) => {
  const gradientId = useId()
  const width = useIsMobile() ? 340 : 560
  const trend = PREVIEW_TRENDS[index]
  const values = trend.points.map((point) => point.e1rm)
  const min = Math.floor((Math.min(...values) - 4) / 5) * 5
  const max = Math.ceil((Math.max(...values) + 4) / 5) * 5
  const innerWidth = width - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom

  const x = (i: number) => PAD.left + (i / (values.length - 1)) * innerWidth
  const y = (value: number) =>
    PAD.top + (1 - (value - min) / (max - min)) * innerHeight

  const line = values
    .map((value, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(value)}`)
    .join(' ')
  const area = `${line} L${x(values.length - 1)},${PAD.top + innerHeight} L${x(
    0
  )},${PAD.top + innerHeight} Z`
  const ticks = [min, (min + max) / 2, max]
  const lastIndex = values.length - 1
  const gain = values[lastIndex] - values[0]

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`${trend.exercise} estimated one-rep max rose from ${values[0]} kg on ${trend.points[0].date} to ${values[lastIndex]} kg on ${trend.points[lastIndex].date}`}
        className="h-auto w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#9b6bff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#9b6bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#262626"
              strokeDasharray="2 4"
            />
            <text
              x={PAD.left - 10}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-neutral-500 text-[11px] tabular-nums"
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}
        <path
          key={`area-${index}`}
          d={area}
          fill={`url(#${gradientId})`}
          className="animate-fade-in"
        />
        <path
          key={`line-${index}`}
          d={line}
          fill="none"
          stroke="#3fe6d6"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          className="trend-draw"
        />
        {values.map((value, i) => (
          <circle
            key={`${index}-${i}`}
            cx={x(i)}
            cy={y(value)}
            r={i === lastIndex ? 5 : 3}
            className={clsx(
              i === lastIndex ? 'fill-app-colors-300' : 'fill-[#141414]',
              'animate-fade-in'
            )}
            stroke={i === lastIndex ? '#94ea43' : '#3fe6d6'}
            strokeWidth="2"
            style={{ animationDelay: `${200 + i * 60}ms` }}
          />
        ))}
        <text
          x={PAD.left}
          y={HEIGHT - 6}
          className="fill-neutral-500 text-[11px]"
        >
          {trend.points[0].date}
        </text>
        <text
          x={width - PAD.right}
          y={HEIGHT - 6}
          textAnchor="end"
          className="fill-neutral-500 text-[11px]"
        >
          {trend.points[lastIndex].date}
        </text>
      </svg>
      <figcaption className="mt-3 flex items-baseline justify-between gap-4 text-sm text-neutral-400">
        <span>Estimated 1RM, kg</span>
        <span>
          <span className="font-medium tabular-nums text-app-colors-300">
            +{gain} kg
          </span>{' '}
          since {trend.points[0].date}
        </span>
      </figcaption>
    </figure>
  )
}

export const ProgressDemo = () => {
  const [selected, setSelected] = useState(0)

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
      <div className="rounded-lg border border-neutral-800 bg-[#141414] lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3 sm:px-6">
          <p className="text-base font-semibold text-neutral-50">
            Strength trend
          </p>
          <div
            role="radiogroup"
            aria-label="Exercise"
            className="flex rounded-md border border-neutral-800 p-0.5"
          >
            {PREVIEW_TRENDS.map((trend, index) => (
              <button
                key={trend.exercise}
                type="button"
                role="radio"
                aria-checked={selected === index}
                onClick={() => setSelected(index)}
                className={clsx(
                  'h-8 rounded-[5px] px-2.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-app-colors-300 sm:px-3',
                  selected === index
                    ? 'bg-neutral-800 text-neutral-50'
                    : 'text-neutral-400 hover:text-neutral-200'
                )}
              >
                {trend.exercise}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-5 pt-6 sm:px-6">
          <TrendChart index={selected} />
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-[#141414] lg:col-span-2">
        <div className="border-b border-neutral-800 px-4 py-3 sm:px-6">
          <p className="flex h-8 items-center text-base font-semibold text-neutral-50">
            Recent records
          </p>
        </div>
        <ol className="px-4 sm:px-6">
          {PREVIEW_RECORDS.map((record) => (
            <li
              key={record.exercise}
              className="flex min-h-16 items-center gap-3 border-t border-neutral-800/80 py-3 first:border-t-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-app-colors-300/10 text-app-colors-300">
                <Trophy aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-medium leading-snug text-neutral-50">
                  {record.exercise}
                </span>
                <span className="block text-sm tabular-nums text-neutral-400">
                  {record.set}, {record.when}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-lg font-bold tabular-nums leading-tight text-neutral-50">
                  {record.e1rm}
                  <span className="ml-0.5 font-main-font text-xs font-normal text-neutral-400">
                    kg
                  </span>
                </span>
                <span className="block text-xs tabular-nums text-app-colors-300">
                  +{record.gain} kg
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
