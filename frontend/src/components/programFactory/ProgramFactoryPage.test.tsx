// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { ReactNode } from 'react'
import { fakeProgramGenServer as server } from '@/services/fakeProgramGenServer'
import { ProgranGenResult } from '@/types/programCreation'

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

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn()
}))

// Saving goes through programsAPI, which imports the whole app router
vi.mock('@/services/programsAPI', () => ({ programImport: vi.fn() }))

vi.stubGlobal('cookieStore', {
  get: async () => null,
  set: async () => undefined,
  delete: async () => undefined
})

const { default: authReducer } = await import('@/features/auth/authSlice')
const { default: programGenerationReducer } = await import(
  '@/features/programGeneration/programGenerationSlice'
)
const { ProgramFactoryPage } = await import('./ProgramFactoryPage')

const PROGRAM: ProgranGenResult = {
  name: 'Upper / Lower',
  program_structure: [
    {
      day: 'Monday',
      focus: 'Upper',
      exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }]
    }
  ],
  program_tips_and_goals: ['Sleep 8 hours']
}

const renderPage = () => {
  const store = configureStore({
    reducer: { auth: authReducer, programGeneration: programGenerationReducer }
  })
  render(
    <Provider store={store}>
      <ProgramFactoryPage />
    </Provider>
  )
  return store
}

const settle = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms))

const formIsShown = () => screen.queryByText('Program Generator') !== null
const loadingIsShown = () => screen.queryByText('Creating program...') !== null
const programIsShown = () =>
  screen.queryByRole('heading', { name: 'Upper / Lower' }) !== null

describe('ProgramFactoryPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    server.reset()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows nothing while checking for a stored job, so the form never flashes', () => {
    server.addJob('job-7', { status: 'done', program: PROGRAM })
    localStorage.setItem('programGenJob', 'job-7')

    renderPage()

    expect(formIsShown()).toBe(false)
    expect(loadingIsShown()).toBe(false)
  })

  it('shows a finished program after a refresh without showing the form', async () => {
    server.addJob('job-7', { status: 'done', program: PROGRAM })
    localStorage.setItem('programGenJob', 'job-7')

    renderPage()
    await settle()

    expect(programIsShown()).toBe(true)
    expect(formIsShown()).toBe(false)
  })

  it('shows the loading screen for a pending job, then the program', async () => {
    server.addJob('job-7', { status: 'pending' })
    localStorage.setItem('programGenJob', 'job-7')

    renderPage()
    await settle()
    expect(loadingIsShown()).toBe(true)

    server.finish('job-7', PROGRAM)
    await settle(2000)

    expect(loadingIsShown()).toBe(false)
    expect(programIsShown()).toBe(true)
  })

  it('clears an expired job and shows the form', async () => {
    localStorage.setItem('programGenJob', 'job-gone')

    renderPage()
    await settle()

    expect(formIsShown()).toBe(true)
    expect(localStorage.getItem('programGenJob')).toBeNull()
  })

  it('start over deletes the job and brings back the form', async () => {
    server.addJob('job-7', { status: 'done', program: PROGRAM })
    localStorage.setItem('programGenJob', 'job-7')
    renderPage()
    await settle()

    fireEvent.click(screen.getByRole('button', { name: /Start over/ }))
    await settle()

    expect(server.jobs.has('job-7')).toBe(false)
    expect(localStorage.getItem('programGenJob')).toBeNull()
    expect(programIsShown()).toBe(false)
  })
})
