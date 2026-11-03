import { useEffect } from 'react'

export const useHideSiteNav = (hidden = true) => {
  useEffect(() => {
    if (!hidden) return
    document.body.setAttribute('data-workout-session', '')
    return () => document.body.removeAttribute('data-workout-session')
  }, [hidden])
}
