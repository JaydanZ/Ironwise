// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { InfoTip } from './info-tip'

const TEXT = 'Tracks your est. 1RM.'

const renderTip = () =>
  render(
    <div>
      <InfoTip label="About strength trend">{TEXT}</InfoTip>
      <p>Elsewhere</p>
    </div>
  )

const trigger = () =>
  screen.getByRole('button', { name: 'About strength trend' })

const openCards = () =>
  screen.queryAllByText(TEXT).filter((node) => !node.closest('[hidden]'))

describe('InfoTip', () => {
  afterEach(cleanup)

  it('stays closed until asked for', () => {
    renderTip()
    expect(openCards()).toHaveLength(0)
  })

  it('gives screen readers the explanation as the button description', () => {
    renderTip()
    const id = trigger().getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)?.textContent).toBe(TEXT)
  })

  it('opens on keyboard focus and closes on Escape', async () => {
    renderTip()
    fireEvent.focus(trigger())
    await waitFor(() => expect(openCards()).toHaveLength(1))
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape'
    })
    await waitFor(() => expect(openCards()).toHaveLength(0))
  })

  it('opens on tap and closes on a tap elsewhere', async () => {
    renderTip()
    fireEvent.click(trigger())
    await waitFor(() => expect(openCards()).toHaveLength(1))
    fireEvent.pointerDown(screen.getByText('Elsewhere'))
    await waitFor(() => expect(openCards()).toHaveLength(0))
  })
})
