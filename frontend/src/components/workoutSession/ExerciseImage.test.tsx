// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ExerciseImage } from './ExerciseImage'

const ART_URL = 'https://art.test/0f11ea468074'

const probe = (container: HTMLElement) => container.querySelector('img')

describe('ExerciseImage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_EXERCISE_ART_URL', ART_URL)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('draws the art for a known exercise', () => {
    const { container } = render(<ExerciseImage name="Bench Press" />)

    screen.getByRole('img', { name: 'Bench Press illustration' })
    expect(probe(container)?.getAttribute('src')).toBe(
      `${ART_URL}/bench-press.svg`
    )
  })

  it('loads the probe in CORS mode, so it fails whenever the mask does', () => {
    const { container } = render(<ExerciseImage name="Bench Press" />)

    expect(probe(container)?.getAttribute('crossorigin')).toBe('anonymous')
  })

  it('shows the placeholder for an unknown exercise', () => {
    const { container } = render(<ExerciseImage name="My Custom Lift" />)

    screen.getByRole('img', { name: 'My Custom Lift image placeholder' })
    expect(probe(container)).toBeNull()
  })

  it('falls back to the placeholder when the art fails to load', () => {
    const { container } = render(<ExerciseImage name="Bench Press" />)

    fireEvent.error(probe(container) as HTMLImageElement)

    screen.getByRole('img', { name: 'Bench Press image placeholder' })
  })

  it('tries the next exercise after a failed load', () => {
    const { container, rerender } = render(<ExerciseImage name="Bench Press" />)
    fireEvent.error(probe(container) as HTMLImageElement)

    rerender(<ExerciseImage name="Deadlift" />)

    screen.getByRole('img', { name: 'Deadlift illustration' })
  })
})
