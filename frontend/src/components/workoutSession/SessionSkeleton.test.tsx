// @vitest-environment happy-dom
import { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SessionSkeleton } from './SessionSkeleton'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: ReactNode
    to: string
    'aria-label'?: string
    className?: string
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  )
}))

const originalWidth = window.innerWidth

const renderAt = (width: number) => {
  window.innerWidth = width
  return render(<SessionSkeleton />)
}

const loading = () => screen.getByLabelText('Loading workout')

describe('SessionSkeleton', () => {
  afterEach(() => {
    cleanup()
    window.innerWidth = originalWidth
  })

  it('fills the screen like the mobile session under 800px', () => {
    renderAt(390)
    expect(loading().getAttribute('aria-busy')).toBe('true')
    expect(loading().className).toContain('h-dvh')
    expect(loading().className).toContain('fixed')
  })

  it('hides the bottom nav only while mounted on mobile', () => {
    const { unmount } = renderAt(390)
    expect(document.body.hasAttribute('data-workout-session')).toBe(true)
    unmount()
    expect(document.body.hasAttribute('data-workout-session')).toBe(false)
  })

  it('keeps a working way back while loading on mobile', () => {
    renderAt(390)
    const back = screen.getByRole('link', { name: 'Back to training' })
    expect(back.getAttribute('href')).toBe('/training')
  })

  it('shows set rows, the set controls and the logging panel on mobile', () => {
    renderAt(390)
    const rows = loading().querySelectorAll('ol > li')
    expect(rows).toHaveLength(3)
    expect(loading().querySelector('.size-\\[4\\.5rem\\]')).not.toBeNull()
    expect(loading().querySelectorAll('.rounded-full.h-12')).toHaveLength(4)
  })

  it('keeps the desktop skeleton at 800px and up', () => {
    renderAt(800)
    expect(loading().className).not.toContain('h-dvh')
    expect(screen.queryByRole('link')).toBeNull()
    expect(document.body.hasAttribute('data-workout-session')).toBe(false)
  })
})
