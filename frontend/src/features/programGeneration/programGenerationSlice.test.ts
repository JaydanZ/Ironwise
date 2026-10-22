// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  fakeProgramGenServer as server,
  httpError
} from '@/services/fakeProgramGenServer'
import { ProgramOptions, ProgranGenResult } from '@/types/programCreation'

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

// authSlice reads the cookie store at import time
vi.stubGlobal('cookieStore', {
  get: async () => null,
  set: async () => undefined,
  delete: async () => undefined
})

const { default: authReducer } = await import('@/features/auth/authSlice')
const {
  default: programGenerationReducer,
  clearProgram,
  resumeAIProgram,
  startAIProgram
} = await import('./programGenerationSlice')

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

const OPTIONS: ProgramOptions = {
  fitness_goal: 'Gain muscle',
  training_style: 'Weightlifting',
  workout_location: 'Gym',
  home_equipment: [],
  years_of_experience: '0 - 1 Years',
  days_per_week: '3 Days',
  age: 25,
  weight: 180,
  weight_unit: 'Lbs',
  gender: 'Male',
  isLoggedIn: false
}

const makeStore = (isLoggedIn = false) =>
  configureStore({
    reducer: {
      auth: authReducer,
      programGeneration: programGenerationReducer
    },
    preloadedState: {
      auth: {
        loading: false,
        isLoggedIn,
        userInfo: {},
        userToken: isLoggedIn ? 'token' : null,
        error: null,
        success: false
      }
    }
  })

const nextPoll = () => vi.advanceTimersByTimeAsync(2000)

describe('programGeneration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    server.reset()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts a job, remembers its ID and polls until the program arrives', async () => {
    const store = makeStore()
    const started = store.dispatch(startAIProgram(OPTIONS))

    await nextPoll()
    expect(localStorage.getItem('programGenJob')).toBe('job-1')
    expect(store.getState().programGeneration.loading).toBe(true)

    server.finish('job-1', PROGRAM)
    await nextPoll()
    const result = await started

    expect(startAIProgram.fulfilled.match(result)).toBe(true)
    expect(store.getState().programGeneration).toMatchObject({
      loading: false,
      jobId: 'job-1',
      aiProgram: PROGRAM
    })
    // Kept so a refresh after the program is shown brings it back
    expect(localStorage.getItem('programGenJob')).toBe('job-1')
  })

  it('counts the free program only once it arrives', async () => {
    const store = makeStore()
    const started = store.dispatch(startAIProgram(OPTIONS))

    await nextPoll()
    expect(localStorage.getItem('programGenUsageTime')).toBeNull()
    expect(server.requestsTo('POST')[0].body).toMatchObject({
      freeLimitEnabled: false
    })

    server.finish('job-1', PROGRAM)
    await nextPoll()
    await started

    expect(localStorage.getItem('programGenUsageTime')).not.toBeNull()
  })

  it('does not use up the free program when the job fails', async () => {
    const store = makeStore()
    const started = store.dispatch(startAIProgram(OPTIONS))
    await nextPoll()

    server.fail('job-1')
    await nextPoll()
    const result = await started

    expect(result.payload).toEqual({ errorCode: 'failed' })
    expect(localStorage.getItem('programGenUsageTime')).toBeNull()
    expect(localStorage.getItem('programGenJob')).toBeNull()
    expect(server.requestsTo('DELETE')).toEqual([
      { method: 'DELETE', url: '/job-1' }
    ])
  })

  it('reports an expired job when it disappears mid-poll', async () => {
    const store = makeStore()
    const started = store.dispatch(startAIProgram(OPTIONS))
    await nextPoll()

    server.jobs.delete('job-1')
    await nextPoll()
    const result = await started

    expect(result.payload).toEqual({ errorCode: 'expired' })
    expect(localStorage.getItem('programGenJob')).toBeNull()
  })

  it('keeps polling through network errors and server restarts', async () => {
    const store = makeStore()
    const started = store.dispatch(startAIProgram(OPTIONS))
    await nextPoll()

    server.failNextGet({ isAxiosError: true, message: 'Network Error' })
    server.failNextGet(httpError(502))
    await nextPoll()
    await nextPoll()
    server.finish('job-1', PROGRAM)
    await nextPoll()

    expect(startAIProgram.fulfilled.match(await started)).toBe(true)
  })

  it('gives up after 15 minutes of pending', async () => {
    const store = makeStore()
    const started = store.dispatch(startAIProgram(OPTIONS))

    await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 2000)

    expect((await started).payload).toEqual({ errorCode: 'expired' })
  })

  it('resumes a stored job that finished while the page was closed', async () => {
    server.addJob('job-7', { status: 'done', program: PROGRAM })
    localStorage.setItem('programGenJob', 'job-7')
    const store = makeStore()

    await store.dispatch(resumeAIProgram())

    expect(store.getState().programGeneration).toMatchObject({
      resumeStatus: 'done',
      aiProgram: PROGRAM,
      jobId: 'job-7'
    })
  })

  it('resumes polling a stored job that is still pending', async () => {
    server.addJob('job-7', { status: 'pending' })
    localStorage.setItem('programGenJob', 'job-7')
    const store = makeStore()

    const resumed = store.dispatch(resumeAIProgram())
    await vi.advanceTimersByTimeAsync(0)
    expect(store.getState().programGeneration.loading).toBe(true)

    server.finish('job-7', PROGRAM)
    await nextPoll()
    await resumed

    expect(store.getState().programGeneration.aiProgram).toEqual(PROGRAM)
  })

  it('clears a stored job that has expired and resumes nothing', async () => {
    localStorage.setItem('programGenJob', 'job-gone')
    const store = makeStore()

    await store.dispatch(resumeAIProgram())

    expect(localStorage.getItem('programGenJob')).toBeNull()
    expect(store.getState().programGeneration).toMatchObject({
      resumeStatus: 'done',
      aiProgram: undefined,
      error: null
    })
  })

  it('finds a logged-in user’s job from another device', async () => {
    server.logIn('user-1')
    server.addJob('job-9', { status: 'done', program: PROGRAM }, 'user-1')
    const store = makeStore(true)

    await store.dispatch(resumeAIProgram())

    expect(store.getState().programGeneration.aiProgram).toEqual(PROGRAM)
    expect(localStorage.getItem('programGenJob')).toBe('job-9')
  })

  it('reports a job that failed while the page was closed, then forgets it', async () => {
    server.addJob('job-7', { status: 'failed' })
    localStorage.setItem('programGenJob', 'job-7')
    const store = makeStore()

    const result = await store.dispatch(resumeAIProgram())

    expect(result.payload).toEqual({ errorCode: 'failed' })
    expect(localStorage.getItem('programGenJob')).toBeNull()
    expect(server.jobs.has('job-7')).toBe(false)
  })

  it('does not start a second poller when the page remounts mid-generation', async () => {
    server.addJob('job-7', { status: 'pending' })
    localStorage.setItem('programGenJob', 'job-7')
    const store = makeStore()

    store.dispatch(resumeAIProgram())
    store.dispatch(resumeAIProgram())
    await nextPoll()

    expect(server.requestsTo('GET')).toHaveLength(2)
  })

  it('start over deletes the job and forgets it', async () => {
    server.addJob('job-7', { status: 'done', program: PROGRAM })
    localStorage.setItem('programGenJob', 'job-7')
    const store = makeStore()
    await store.dispatch(resumeAIProgram())

    await store.dispatch(clearProgram())

    expect(server.jobs.has('job-7')).toBe(false)
    expect(localStorage.getItem('programGenJob')).toBeNull()
    expect(store.getState().programGeneration.aiProgram).toBeUndefined()
  })
})
