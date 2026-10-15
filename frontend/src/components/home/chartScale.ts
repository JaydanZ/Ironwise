import { parseLogDate } from '../training/workoutHistory'

const DAY_MS = 86_400_000

export const niceStep = (range: number, count: number): number => {
  const raw = range / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const n = raw / magnitude
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * magnitude
}

export const valueScale = (values: number[], tickCount = 3) => {
  let min = Math.min(...values)
  let max = Math.max(...values)
  // A flat trend still needs a band, padded evenly so the line sits mid-chart
  if (min === max) {
    const pad = Math.max(Math.abs(max) * 0.05, 1)
    min -= pad
    max += pad
  }
  const range = max - min
  const step = niceStep(range, tickCount)
  let lo = Math.floor(min / step) * step
  let hi = Math.ceil(max / step) * step
  if (lo === hi) {
    lo -= step
    hi += step
  }
  const ticks: number[] = []
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t)
  return { lo, hi, ticks }
}

export const dayNumber = (value: string): number => {
  const date = parseLogDate(value)
  if (!date) return NaN
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
  )
}

export interface TimeTick {
  day: number
  label: string
}

const SHORT_SPAN_DAYS = 62

export const timeTicks = (
  first: string,
  last: string,
  maxTicks = 6
): TimeTick[] => {
  const start = parseLogDate(first)
  const end = parseLogDate(last)
  if (!start || !end) return []

  const startDay = dayNumber(first)
  const endDay = dayNumber(last)
  const short = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (endDay - startDay < SHORT_SPAN_DAYS) {
    if (startDay === endDay) return [{ day: startDay, label: short(start) }]
    return [
      { day: startDay, label: short(start) },
      { day: endDay, label: short(end) }
    ]
  }

  const months: TimeTick[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  while (cursor <= end) {
    months.push({
      day: Math.round(
        Date.UTC(cursor.getFullYear(), cursor.getMonth(), 1) / DAY_MS
      ),
      label: cursor.toLocaleDateString('en-US', { month: 'short' })
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const stride = Math.ceil(months.length / maxTicks)
  return months.filter((_, index) => index % stride === 0)
}
