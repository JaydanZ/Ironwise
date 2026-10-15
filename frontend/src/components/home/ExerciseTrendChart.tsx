import {
  KeyboardEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { parseLogDate } from '../training/workoutHistory'
import { dayNumber, timeTicks, valueScale } from './chartScale'
import { ExerciseTrend, formatWeight } from './progress'

const HEIGHT = 176
const PAD = { top: 16, right: 16, bottom: 28, left: 44 }
const GAP_DAYS = 28

const shortDate = (value: string): string =>
  parseLogDate(value)?.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) ?? value

const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

export const ExerciseTrendChart = ({ trend }: { trend: ExerciseTrend }) => {
  const { ref, width } = useWidth()
  const [active, setActive] = useState<number | null>(null)
  const { points, unit } = trend

  const geometry = useMemo(() => {
    const { lo, hi, ticks } = valueScale(points.map((p) => p.value))
    const plotWidth = Math.max(width - PAD.left - PAD.right, 1)
    const plotHeight = HEIGHT - PAD.top - PAD.bottom
    const days = points.map((p) => dayNumber(p.date))
    const firstDay = days[0]
    const span = days[days.length - 1] - firstDay
    const xAt = (day: number) =>
      PAD.left +
      (span > 0 ? ((day - firstDay) / span) * plotWidth : plotWidth / 2)
    const x = (i: number) => xAt(days[i])
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotHeight
    const path = points
      .map(
        (p, i) =>
          `${i === 0 || days[i] - days[i - 1] > GAP_DAYS ? 'M' : 'L'}${x(
            i
          ).toFixed(1)},${y(p.value).toFixed(1)}`
      )
      .join(' ')
    const dateTicks = timeTicks(points[0].date, points[points.length - 1].date)
      .map((tick) => ({ ...tick, x: xAt(tick.day) }))
      .map((tick) => ({
        ...tick,
        anchor:
          tick.x - PAD.left < 20
            ? ('start' as const)
            : width - PAD.right - tick.x < 20
              ? ('end' as const)
              : ('middle' as const)
      }))
    return { ticks, dateTicks, x, y, path }
  }, [points, width])

  useEffect(() => setActive(null), [trend])

  const last = points.length - 1
  const nearestIndex = (clientX: number, target: Element) => {
    const left = target.getBoundingClientRect().left
    let best = 0
    let bestDistance = Infinity
    points.forEach((_, i) => {
      const distance = Math.abs(geometry.x(i) - (clientX - left))
      if (distance < bestDistance) {
        bestDistance = distance
        best = i
      }
    })
    return best
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) =>
    setActive(nearestIndex(event.clientX, event.currentTarget))

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const current = active ?? last
    const next =
      event.key === 'ArrowLeft'
        ? Math.max(current - 1, 0)
        : event.key === 'ArrowRight'
          ? Math.min(current + 1, last)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    setActive(next)
  }

  const shown = active !== null && active <= last ? active : last
  const point = points[shown]

  return (
    <div ref={ref}>
      <p
        aria-live="polite"
        className="flex min-h-5 flex-wrap items-baseline gap-x-2 text-sm tabular-nums"
      >
        <span className="text-neutral-400">
          {active === null ? 'Latest' : shortDate(point.date)}
        </span>
        <span className="font-semibold text-neutral-50">
          {formatWeight(point.value)} {unit}{' '}
          <span className="font-normal text-neutral-400">est. 1RM</span>
        </span>
        <span className="text-neutral-400">
          from {formatWeight(point.set.weight)} {point.set.unit} &times;{' '}
          {point.set.reps}
        </span>
      </p>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          tabIndex={0}
          aria-label={`${trend.exercise} estimated one-rep max across ${
            points.length
          } sessions in the past year, from ${formatWeight(
            points[0].value
          )} to ${formatWeight(
            points[last].value
          )} ${unit}. Use arrow keys to step through sessions.`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(last)}
          onBlur={() => setActive(null)}
          onKeyDown={handleKeyDown}
          className="mt-2 block touch-pan-y rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-app-colors-300"
        >
          {geometry.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geometry.y(tick)}
                y2={geometry.y(tick)}
                className="stroke-neutral-800"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={geometry.y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-neutral-500 text-[11px] tabular-nums"
              >
                {formatWeight(tick)}
              </text>
            </g>
          ))}

          {geometry.dateTicks.map((tick) => (
            <text
              key={tick.day}
              x={tick.x}
              y={HEIGHT - 8}
              textAnchor={tick.anchor}
              className="fill-neutral-500 text-[11px]"
            >
              {tick.label}
            </text>
          ))}

          {active !== null && (
            <line
              x1={geometry.x(active)}
              x2={geometry.x(active)}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              className="stroke-neutral-600"
              strokeWidth={1}
            />
          )}

          <path
            d={geometry.path}
            fill="none"
            className="stroke-app-colors-300"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <circle
            cx={geometry.x(shown)}
            cy={geometry.y(point.value)}
            r={4.5}
            className="fill-app-colors-300 stroke-[#141414]"
            strokeWidth={2}
          />
        </svg>
      )}

      <table className="sr-only">
        <caption>{trend.exercise} sessions</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Best set</th>
            <th scope="col">Estimated 1RM ({unit})</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{shortDate(p.date)}</td>
              <td>
                {formatWeight(p.set.weight)} {p.set.unit} × {p.set.reps}
              </td>
              <td>{formatWeight(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
