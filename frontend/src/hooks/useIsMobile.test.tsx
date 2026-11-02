// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import useIsMobile from './useIsMobile'

const originalWidth = window.innerWidth

describe('useIsMobile', () => {
  afterEach(() => {
    cleanup()
    window.innerWidth = originalWidth
  })

  it('is correct on the first render, so phones never flash desktop', () => {
    window.innerWidth = 390
    const renders: boolean[] = []
    const Probe = () => {
      renders.push(useIsMobile())
      return null
    }
    render(<Probe />)
    expect(renders[0]).toBe(true)
  })
})
