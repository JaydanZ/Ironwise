import { isAxiosError } from 'axios'
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

import {
  clearStoredJobId,
  discardProgramJob,
  findResumableJob,
  getProgramJob,
  isNotFound,
  markFreeProgramUsed,
  startProgramGeneration
} from '@/services/programGenAPI'
import { userLogin, userLogout } from '@/features/auth/authSlice'
import { ProgranGenResult, ProgramOptions } from '@/types/programCreation'

const POLL_INTERVAL_MS = 2000
// Matches the backend's pending-job TTL; past this the job can't finish
const POLL_TIMEOUT_MS = 15 * 60 * 1000

export type ProgramJobErrorCode = 'failed' | 'expired'

export interface ProgramGenerationError {
  errorCode: number | ProgramJobErrorCode | undefined
  errorMessage?: object
}

interface ProgramGenerationState {
  loading: boolean
  aiProgram: ProgranGenResult | undefined
  jobId: string | undefined
  resumeStatus: 'idle' | 'checking' | 'done'
  error: ProgramGenerationError | null
}

interface GeneratedProgram {
  jobId: string
  program: ProgranGenResult
}

// Typed locally because RootState is built from this slice
type ThunkConfig = {
  state: {
    auth: { isLoggedIn: boolean }
    programGeneration: ProgramGenerationState
  }
  rejectValue: ProgramGenerationError
}

const initialState: ProgramGenerationState = {
  loading: false,
  aiProgram: undefined,
  jobId: undefined,
  resumeStatus: 'idle',
  error: null
}

class ProgramJobError extends Error {
  code: ProgramJobErrorCode

  constructor(code: ProgramJobErrorCode) {
    super(code)
    this.code = code
  }
}

export const isProgramJobError = (
  error: ProgramGenerationError | null | undefined
) => error?.errorCode === 'failed' || error?.errorCode === 'expired'

const toGenerationError = (error: unknown): ProgramGenerationError => {
  if (error instanceof ProgramJobError) return { errorCode: error.code }
  if (isAxiosError(error)) {
    return { errorMessage: error.response?.data, errorCode: error.status }
  }
  return { errorCode: undefined }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Network errors and 5xx (an API restart, say) keep polling; only the job's outcome ends it
const waitForProgram = async (jobId: string) => {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    try {
      const job = await getProgramJob(jobId)
      if (job.status === 'done' && job.program) return job.program
      if (job.status === 'failed') throw new ProgramJobError('failed')
    } catch (error) {
      if (error instanceof ProgramJobError) throw error
      if (isNotFound(error)) throw new ProgramJobError('expired')
      const status = isAxiosError(error) ? error.status : undefined
      if (status && status >= 400 && status < 500 && status !== 429)
        throw error
    }
  }
  throw new ProgramJobError('expired')
}

const programArrived = (program: ProgranGenResult, isLoggedIn: boolean) => {
  if (!isLoggedIn) markFreeProgramUsed()
  return program
}

const settleJob = async (jobId: string, isLoggedIn: boolean) => {
  try {
    return programArrived(await waitForProgram(jobId), isLoggedIn)
  } catch (error) {
    if (error instanceof ProgramJobError) {
      if (error.code === 'failed') discardProgramJob(jobId)
      else clearStoredJobId()
    }
    throw error
  }
}

const programGenerationSlice = createSlice({
  name: 'programGeneration',
  initialState,
  reducers: {
    jobStarted(state, action: PayloadAction<string>) {
      state.jobId = action.payload
      state.loading = true
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder.addCase(startAIProgram.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(resumeAIProgram.pending, (state) => {
      state.resumeStatus = 'checking'
    })
    // jobId is kept until fulfilled: pending runs before the thunk reads it to delete the job
    builder.addCase(clearProgram.pending, (state) => {
      state.aiProgram = undefined
      state.error = null
      state.resumeStatus = 'done'
    })
    builder.addCase(clearProgram.fulfilled, (state) => {
      state.jobId = undefined
    })
    builder.addCase(userLogin.fulfilled, (state) => {
      state.resumeStatus = 'idle'
    })
    builder.addCase(userLogout.fulfilled, () => initialState)
    builder.addMatcher(
      (action) =>
        startAIProgram.fulfilled.match(action) ||
        resumeAIProgram.fulfilled.match(action),
      (state, action: PayloadAction<GeneratedProgram | null>) => {
        state.loading = false
        state.resumeStatus = 'done'
        state.error = null
        if (action.payload) {
          state.jobId = action.payload.jobId
          state.aiProgram = action.payload.program
        }
      }
    )
    builder.addMatcher(
      (action) =>
        startAIProgram.rejected.match(action) ||
        (resumeAIProgram.rejected.match(action) && !action.meta.condition),
      (state, action: PayloadAction<ProgramGenerationError | undefined>) => {
        state.loading = false
        state.resumeStatus = 'done'
        state.jobId = undefined
        state.error = action.payload ?? { errorCode: undefined }
      }
    )
  }
})

const { jobStarted } = programGenerationSlice.actions

export const startAIProgram = createAsyncThunk<
  GeneratedProgram,
  ProgramOptions,
  ThunkConfig
>(
  'programGeneration/start',
  async (programOptions, { dispatch, getState, rejectWithValue }) => {
    try {
      const jobId = await startProgramGeneration(programOptions)
      dispatch(jobStarted(jobId))
      const program = await settleJob(jobId, getState().auth.isLoggedIn)
      return { jobId, program }
    } catch (error) {
      return rejectWithValue(toGenerationError(error))
    }
  }
)

// Picks up a job from an earlier visit, another tab or (logged in) another device
export const resumeAIProgram = createAsyncThunk<
  GeneratedProgram | null,
  void,
  ThunkConfig
>(
  'programGeneration/resume',
  async (_, { dispatch, getState, rejectWithValue }) => {
    const isLoggedIn = getState().auth.isLoggedIn
    try {
      const resumable = await findResumableJob(isLoggedIn)
      if (!resumable) return null

      const { jobId, job } = resumable
      if (job.status === 'done' && job.program) {
        return { jobId, program: programArrived(job.program, isLoggedIn) }
      }
      if (job.status === 'failed') {
        discardProgramJob(jobId)
        throw new ProgramJobError('failed')
      }

      dispatch(jobStarted(jobId))
      return { jobId, program: await settleJob(jobId, isLoggedIn) }
    } catch (error) {
      return rejectWithValue(toGenerationError(error))
    }
  },
  {
    // Also stops a second poller when the page remounts mid-generation
    condition: (_, { getState }) => {
      const { resumeStatus, loading, aiProgram } = getState().programGeneration
      return resumeStatus === 'idle' && !loading && !aiProgram
    }
  }
)

export const clearProgram = createAsyncThunk<void, void, ThunkConfig>(
  'programGeneration/clear',
  async (_, { getState }) => {
    await discardProgramJob(getState().programGeneration.jobId)
  }
)

export default programGenerationSlice.reducer
