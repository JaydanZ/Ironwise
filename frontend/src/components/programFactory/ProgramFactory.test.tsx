// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  const { fakeProgramGenServer } = await import(
    '@/services/fakeProgramGenServer'
  )
  return {
    ...actual,
    default: { ...actual.default, create: () => fakeProgramGenServer.client }
  }
})

vi.stubGlobal('cookieStore', {
  get: async () => null,
  set: async () => undefined,
  delete: async () => undefined
})

// happy-dom has no Web Animations API
Element.prototype.animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation)

const { default: authReducer } = await import('@/features/auth/authSlice')
const { default: programGenerationReducer } = await import(
  '@/features/programGeneration/programGenerationSlice'
)
const { ProgramFactory } = await import('./ProgramFactory')

const renderFactory = () => {
  const store = configureStore({
    reducer: { auth: authReducer, programGeneration: programGenerationReducer }
  })
  render(
    <Provider store={store}>
      <ProgramFactory />
    </Provider>
  )
}

const title = () => screen.getByRole('heading', { level: 2 }).textContent
const pick = (name: string) =>
  fireEvent.click(screen.getByRole('radio', { name }))
const tick = (name: string) =>
  fireEvent.click(screen.getByRole('checkbox', { name }))
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }))

const reachLocation = () => {
  pick('Gain muscle')
  next()
  pick('Calisthenics')
  next()
}

const reachSummary = () => {
  next()
  pick('0 - 1 Years')
  next()
  pick('3 Days')
  next()
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '25' } })
  fireEvent.change(screen.getByLabelText('Weight'), {
    target: { value: '180' }
  })
  pick('Male')
  next()
}

const summaryRow = (label: string) =>
  Array.from(document.querySelectorAll('[data-summary-row]')).find(
    (row) => row.firstElementChild?.textContent === label
  )?.textContent

describe('ProgramFactory', () => {
  afterEach(cleanup)

  it('asks for training style and location right after the goal', () => {
    renderFactory()
    expect(title()).toBe('Fitness Goals')

    pick('Gain muscle')
    next()
    expect(title()).toBe('Training Style')
    expect(screen.getByRole('radio', { name: 'Hybrid' })).toBeTruthy()

    pick('Calisthenics')
    next()
    expect(title()).toBe('Workout Location')

    pick('Gym')
    next()
    expect(title()).toBe('Years of Experience')
  })

  it('needs a training style before moving on', () => {
    renderFactory()
    pick('Gain muscle')
    next()
    next()

    expect(title()).toBe('Training Style')
    expect(screen.getByText('Error: you must select an option')).toBeTruthy()
  })

  it('only asks about equipment when training at home', () => {
    renderFactory()
    reachLocation()

    pick('Gym')
    expect(screen.queryByRole('checkbox', { name: 'Dumbbells' })).toBeNull()

    pick('At home')
    expect(screen.getByRole('checkbox', { name: 'Dumbbells' })).toBeTruthy()
  })

  it('needs at least one piece of equipment for home workouts', () => {
    renderFactory()
    reachLocation()
    pick('At home')
    next()

    expect(title()).toBe('Workout Location')
    expect(
      screen.getByText('Error: select the equipment you have, or None')
    ).toBeTruthy()
  })

  it('hides the equipment from the bottom row up when switching back to gym', () => {
    renderFactory()
    reachLocation()

    const revealDelay = (name: string) =>
      screen.getByRole('checkbox', { name, hidden: true }).closest('div')
        ?.style.transitionDelay

    pick('At home')
    expect(revealDelay('None')).toBe('0ms')
    expect(revealDelay('Barbell and rack')).toBe('90ms')

    pick('Gym')
    expect(revealDelay('None')).toBe('90ms')
    expect(revealDelay('Barbell and rack')).toBe('0ms')
  })

  it('keeps bodyweight only and equipment mutually exclusive', () => {
    renderFactory()
    reachLocation()
    pick('At home')

    const checked = (name: string) =>
      (screen.getByRole('checkbox', { name }) as HTMLInputElement).checked

    tick('Dumbbells')
    tick('Pull-up bar')
    tick('None')
    expect(checked('None')).toBe(true)
    expect(checked('Dumbbells')).toBe(false)
    expect(checked('Pull-up bar')).toBe(false)

    tick('Resistance bands')
    expect(checked('Resistance bands')).toBe(true)
    expect(checked('None')).toBe(false)
  })

  it('summarises style, location and home equipment', () => {
    renderFactory()
    reachLocation()
    pick('At home')
    tick('Pull-up bar')
    tick('Dumbbells')
    reachSummary()

    expect(title()).toBe('Summary')
    expect(summaryRow('Training style')).toContain('Calisthenics')
    expect(summaryRow('Location')).toContain('At home')
    expect(summaryRow('Equipment')).toContain('Pull-up bar, Dumbbells')
    expect(summaryRow('Gender')).toContain('Male')
  })

  it('leaves equipment out of the summary for gym workouts', () => {
    renderFactory()
    reachLocation()
    pick('At home')
    tick('Dumbbells')
    pick('Gym')
    reachSummary()

    expect(summaryRow('Location')).toContain('Gym')
    expect(summaryRow('Equipment')).toBeUndefined()
  })
})
