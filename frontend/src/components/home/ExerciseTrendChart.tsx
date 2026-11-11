import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { useInView } from 'motion/react'
import {
  EChartsLineChart,
  type ChartConfig
} from '@/components/evilcharts/charts/echarts-line-chart'
import { parseLogDate } from '../training/workoutHistory'
import { ExerciseTrend, formatWeight } from './progress'

const shortDate = (value: string): string =>
  parseLogDate(value)?.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) ?? value

const chartConfig = {
  e1rm: {
    label: 'Best set',
    colors: { light: ['#46ea43'], dark: ['#46ea43'] }
  }
} satisfies ChartConfig

type ChartInstance = ReturnType<typeof echarts.init>

export const ExerciseTrendChart = ({ trend }: { trend: ExerciseTrend }) => {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ChartInstance | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const inView = useInView(plotRef, { once: true, amount: 0.6 })
  const [active, setActive] = useState<number | null>(null)
  const { points, unit } = trend

  const data = useMemo(
    () => points.map((p) => ({ date: shortDate(p.date), e1rm: p.value })),
    [points]
  )

  useEffect(() => setActive(null), [trend])

  useEffect(() => {
    const mount = ref.current?.querySelector<HTMLElement>(
      '[_echarts_instance_]'
    )
    const chart = mount ? echarts.getInstanceByDom(mount) : undefined
    if (!chart) return
    chartRef.current = chart
    const onAxisPointer = (event: unknown) => {
      const index = (event as { axesInfo?: { value: number }[] }).axesInfo?.[0]
        ?.value
      if (typeof index === 'number') setActive(index)
    }
    const onLeave = () => setActive(null)
    chart.on('updateAxisPointer', onAxisPointer)
    chart.getZr().on('globalout', onLeave)
    return () => {
      chartRef.current = null
      if (chart.isDisposed()) return
      chart.off('updateAxisPointer', onAxisPointer)
      chart.getZr().off('globalout', onLeave)
    }
  }, [inView])

  const last = points.length - 1

  const showSession = (index: number) => {
    setActive(index)
    chartRef.current?.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex: index
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
    showSession(next)
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
          {formatWeight(point.set.weight)} {point.set.unit} &times;{' '}
          {point.set.reps}
        </span>
        <span className="text-neutral-400">
          <span aria-hidden>&middot; </span>
          <span className="sr-only">, </span>
          {formatWeight(point.value)} {unit} est. 1RM
        </span>
      </p>
      <div
        ref={plotRef}
        role="img"
        tabIndex={0}
        aria-label={`${trend.exercise} estimated one-rep max across ${
          points.length
        } sessions in the past year, from ${formatWeight(
          points[0].value
        )} to ${formatWeight(
          points[last].value
        )} ${unit}. Use arrow keys to step through sessions.`}
        onFocus={() => showSession(last)}
        onBlur={() => {
          setActive(null)
          chartRef.current?.dispatchAction({ type: 'hideTip' })
        }}
        onKeyDown={handleKeyDown}
        className="mt-2 touch-pan-y rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-app-colors-300"
      >
        {inView ? (
          <EChartsLineChart
            data={data}
            config={chartConfig}
            xDataKey="date"
            className="h-44"
          >
            <EChartsLineChart.Grid />
            <EChartsLineChart.XAxis />
            <EChartsLineChart.YAxis
              scale
              tickFormatter={(value) => formatWeight(value)}
            />
            <EChartsLineChart.Tooltip
              valueFormatter={(_, index) => {
                const { set } = points[index]
                return `${formatWeight(set.weight)} ${set.unit} × ${set.reps}`
              }}
            />
            <EChartsLineChart.Line dataKey="e1rm" strokeWidth={2}>
              <EChartsLineChart.Dot />
              <EChartsLineChart.ActiveDot variant="colored-border" />
            </EChartsLineChart.Line>
          </EChartsLineChart>
        ) : (
          <div className="h-44" />
        )}
      </div>

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
