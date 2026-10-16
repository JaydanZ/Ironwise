interface Location {
  pathname: string
  state: { __TSR_index?: number; __TSR_key?: string; key?: string }
}

interface LocationChange {
  fromLocation?: Location
  toLocation: Location
}

interface ViewTransitionOptions {
  types: (change: LocationChange) => string[] | false
}

const entryKey = (location: Location) =>
  location.state.__TSR_key ?? location.state.key

const entryIndex = (location: Location) => location.state.__TSR_index

// Same matching as the navbar's active tab
export const tabIndex = (hrefs: string[], pathname: string) =>
  hrefs.findIndex((href) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)
  )

export const createPageTransitions = () => {
  const visited = new Set<string>()
  let browserAnimated = false

  const remember = ({ fromLocation, toLocation }: LocationChange) => {
    for (const location of [fromLocation, toLocation]) {
      const key = location && entryKey(location)
      if (key) visited.add(key)
    }
  }

  const slideLeft: ViewTransitionOptions = {
    types: (change) => {
      remember(change)
      return ['slide-left']
    }
  }

  const tabs = (hrefs: string[]): ViewTransitionOptions => ({
    types: (change) => {
      remember(change)
      if (!change.fromLocation) return false
      const from = tabIndex(hrefs, change.fromLocation.pathname)
      const to = tabIndex(hrefs, change.toLocation.pathname)
      if (to === -1 || from === to) return false
      return to > from ? ['slide-left'] : ['slide-right']
    }
  })

  const historyDefault: ViewTransitionOptions = {
    types: ({ fromLocation, toLocation }) => {
      const skip = browserAnimated
      browserAnimated = false
      const toKey = entryKey(toLocation)
      const isRevisit = Boolean(toKey && visited.has(toKey))
      remember({ fromLocation, toLocation })
      if (skip || !fromLocation) return false

      const from = entryIndex(fromLocation)
      const to = entryIndex(toLocation)
      if (typeof from !== 'number' || typeof to !== 'number') return false

      if (to < from) return ['slide-right']
      if (to > from && isRevisit) return ['slide-left']
      return false
    }
  }

  const notePopState = (event: PopStateEvent) => {
    browserAnimated = Boolean(
      (event as PopStateEvent & { hasUAVisualTransition?: boolean })
        .hasUAVisualTransition
    )
  }

  return { slideLeft, tabs, historyDefault, notePopState }
}

export const supportsViewTransitionTypes = () =>
  typeof window !== 'undefined' &&
  'ViewTransition' in window &&
  'types' in
    (window as unknown as { ViewTransition: { prototype: object } })
      .ViewTransition.prototype

export const pageTransitions = createPageTransitions()

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', pageTransitions.notePopState, {
    capture: true
  })
}
