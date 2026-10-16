// @vitest-environment happy-dom
import { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Dumbbell } from 'lucide-react'
import { SettingsGroup, SettingsRow } from './SettingsGroup'

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
  }) => (
    <a
      href={to}
      className={className}
      data-view-transition={JSON.stringify(viewTransition ?? null)}
    >
      {children}
    </a>
  )
}))

const renderRow = (props: Partial<Parameters<typeof SettingsRow>[0]>) =>
  render(
    <SettingsGroup label="Training">
      <SettingsRow icon={Dumbbell} label="Active program" {...props} />
    </SettingsGroup>
  )

describe('SettingsRow', () => {
  afterEach(cleanup)

  it('slides the next page in when asked to', () => {
    renderRow({ to: '/training', value: 'Upper / Lower', slide: true })
    const link = screen.getByRole('link', { name: /Active program/ })
    expect(link.getAttribute('href')).toBe('/training')
    expect(JSON.parse(link.dataset.viewTransition!)).toEqual({
      types: ['slide-left']
    })
  })

  it('navigates without a transition by default', () => {
    renderRow({ to: '/changePassword' })
    const link = screen.getByRole('link', { name: /Active program/ })
    expect(JSON.parse(link.dataset.viewTransition!)).toBeNull()
  })

  it('renders a plain row without a destination', () => {
    renderRow({ value: '5' })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('5')).toBeTruthy()
  })
})
