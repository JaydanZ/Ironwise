import { describe, expect, it } from 'vitest'
import { dayNumber, niceStep, timeTicks, valueScale } from './chartScale'

describe('valueScale', () => {
  it('snaps the domain outward to round steps', () => {
    expect(valueScale([171, 215])).toEqual({
      lo: 160,
      hi: 220,
      ticks: [160, 180, 200, 220]
    })
  })

  it('gives a flat trend a band with room on both sides', () => {
    const { lo, hi, ticks } = valueScale([228, 228])
    expect(ticks).toEqual([210, 220, 230, 240])
    expect(228 - lo).toBeGreaterThan(10)
    expect(hi - 228).toBeGreaterThan(10)
  })

  it('picks 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(44, 3)).toBe(20)
    expect(niceStep(7, 3)).toBe(2.5)
    expect(niceStep(300, 3)).toBe(100)
  })
})

describe('dayNumber', () => {
  it('counts whole days across a daylight saving change', () => {
    expect(dayNumber('2026-03-09') - dayNumber('2026-03-07')).toBe(2)
    expect(dayNumber('2026-11-02') - dayNumber('2026-10-31')).toBe(2)
  })
})

describe('timeTicks', () => {
  it('labels the two ends of a short span by date', () => {
    expect(timeTicks('2026-09-26', '2026-10-05').map((t) => t.label)).toEqual([
      'Sep 26',
      'Oct 5'
    ])
  })

  it('labels a single day once', () => {
    expect(timeTicks('2026-10-05', '2026-10-05')).toHaveLength(1)
  })

  it('labels month starts across a long span, thinned to the limit', () => {
    const ticks = timeTicks('2025-10-20', '2026-10-15')
    expect(ticks.map((t) => t.label)).toEqual([
      'Nov',
      'Jan',
      'Mar',
      'May',
      'Jul',
      'Sep'
    ])
    expect(ticks[0].day).toBe(dayNumber('2025-11-01'))
  })

  it('keeps every month when they fit', () => {
    expect(timeTicks('2026-06-10', '2026-10-15').map((t) => t.label)).toEqual([
      'Jul',
      'Aug',
      'Sep',
      'Oct'
    ])
  })
})
