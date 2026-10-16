import { describe, expect, it } from 'vitest'
import { createPageTransitions, tabIndex } from './pageTransitions'

const NAV = ['/home', '/training', '/profile', '/community']

const entry = (
  pathname: string,
  index: number,
  key = `${pathname}-${index}`
) => ({
  pathname,
  state: { __TSR_index: index, __TSR_key: key, key }
})

type Entry = ReturnType<typeof entry>

const change = (from: Entry | undefined, to: Entry) => ({
  fromLocation: from,
  toLocation: to
})

const popstate = (hasUAVisualTransition: boolean) =>
  Object.assign(new Event('popstate'), {
    hasUAVisualTransition
  }) as PopStateEvent

describe('tabIndex', () => {
  it('matches nested paths to their tab and only "/" exactly', () => {
    expect(tabIndex(NAV, '/training')).toBe(1)
    expect(tabIndex(NAV, '/profile/settings')).toBe(2)
    expect(tabIndex(NAV, '/workout')).toBe(-1)
    expect(tabIndex(['/', '/login'], '/login')).toBe(1)
    expect(tabIndex(['/', '/login'], '/registerUser')).toBe(-1)
  })
})

describe('navbar transitions', () => {
  const home = entry('/home', 1)
  const profile = entry('/profile', 2)
  const community = entry('/community', 3)

  it('slides the new page in from the right for a tab further right', () => {
    const { tabs } = createPageTransitions()
    expect(tabs(NAV).types(change(home, profile))).toEqual(['slide-left'])
    expect(tabs(NAV).types(change(profile, community))).toEqual(['slide-left'])
  })

  it('slides the new page in from the left for a tab further left', () => {
    const { tabs } = createPageTransitions()
    expect(tabs(NAV).types(change(community, home))).toEqual(['slide-right'])
  })

  it('stays still when the current tab is picked again', () => {
    const { tabs } = createPageTransitions()
    expect(tabs(NAV).types(change(profile, entry('/profile', 3)))).toBe(false)
  })

  it('slides forward when arriving from a page outside the navbar', () => {
    const { tabs } = createPageTransitions()
    expect(tabs(NAV).types(change(entry('/workout', 1), home))).toEqual([
      'slide-left'
    ])
  })
})

describe('history transitions', () => {
  const profile = entry('/profile', 3)
  const training = entry('/training', 4)

  it('slides back to the left for any back step', () => {
    const { historyDefault } = createPageTransitions()
    expect(historyDefault.types(change(training, profile))).toEqual([
      'slide-right'
    ])
  })

  it('slides forward again for a forward step', () => {
    const { tabs, historyDefault } = createPageTransitions()
    tabs(NAV).types(change(profile, training))
    historyDefault.types(change(training, profile))
    expect(historyDefault.types(change(profile, training))).toEqual([
      'slide-left'
    ])
  })

  it('leaves ordinary links, replaces and the first load instant', () => {
    const { historyDefault } = createPageTransitions()
    // A link to a new page outside the navbar
    expect(historyDefault.types(change(profile, entry('/workout', 4)))).toBe(
      false
    )
    // A replace keeps the same index
    expect(
      historyDefault.types(change(profile, entry('/profile', 3, 'b')))
    ).toBe(false)
    expect(historyDefault.types(change(undefined, profile))).toBe(false)
  })

  it('skips the slide when the browser already animated a swipe back', () => {
    const { historyDefault, notePopState } = createPageTransitions()
    notePopState(popstate(true))
    expect(historyDefault.types(change(training, profile))).toBe(false)

    // The next back button press animates again
    notePopState(popstate(false))
    expect(historyDefault.types(change(training, profile))).toEqual([
      'slide-right'
    ])
  })
})

describe('push links', () => {
  it('always slide the new page in from the right', () => {
    const { slideLeft } = createPageTransitions()
    expect(
      slideLeft.types(change(entry('/profile', 2), entry('/training', 3)))
    ).toEqual(['slide-left'])
  })
})
