// @vitest-environment happy-dom
import { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Dumbbell } from 'lucide-react'
import { pageTransitions } from '@/lib/pageTransitions'
import { SettingsGroup, SettingsRow } from './SettingsGroup'

const linkTransitions: unknown[] = []

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    viewTransition,
    children,
    className
  }: {
    to: string
    viewTransition?: unknown
    children: ReactNode
    className?: string
  }) => {
    linkTransitions.push(viewTransition)
    return (
      <a href={to} className={className}>
        {children}
      </a>
    )
  }
}))

const renderRow = (props: Partial<Parameters<typeof SettingsRow>[0]>) =>
  render(
    <SettingsGroup label="Training">
      <SettingsRow icon={Dumbbell} label="Active program" {...props} />
    </SettingsGroup>
  )

describe('SettingsRow', () => {
  afterEach(() => {
    cleanup()
    linkTransitions.length = 0
  })

  it('slides the next page in when asked to', () => {
    renderRow({ to: '/training', value: 'Upper / Lower', slide: true })
    const link = screen.getByRole('link', { name: /Active program/ })
    expect(link.getAttribute('href')).toBe('/training')
    expect(linkTransitions.at(-1)).toBe(pageTransitions.slideLeft)
  })

  it('navigates without a transition by default', () => {
    renderRow({ to: '/changePassword' })
    expect(screen.getByRole('link', { name: /Active program/ })).toBeTruthy()
    expect(linkTransitions.at(-1)).toBeUndefined()
  })

  it('renders a plain row without a destination', () => {
    renderRow({ value: '5' })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('5')).toBeTruthy()
  })
})
