import axios, { isAxiosError } from 'axios'
import {
  LatestProgramJob,
  ProgramJob,
  ProgramOptions,
  ProgramSubmission
} from '@/types/programCreation'
import { API_BASE_URL } from './apiConfig'
import { genNewAccessToken } from './authAPI'

const LIMIT_EXPIRATION_TIME = 3600000 // 1 Hour
const USAGE_TIME_KEY = 'programGenUsageTime'
const JOB_ID_KEY = 'programGenJob'

const programGenApi = axios.create({
  baseURL: `${API_BASE_URL}/programs/generate`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Logged-out users can generate too, so a token is sent when there is one but never required
programGenApi.interceptors.request.use(async (config) => {
  const tokenInStore = await cookieStore.get('auth_token')
  if (tokenInStore?.value)
    config.headers.Authorization = `Bearer ${tokenInStore.value}`
  return config
})

// Only a stale token is worth refreshing; a 401 without one is the free-limit answer
programGenApi.interceptors.response.use(undefined, async (error) => {
  const originalRequest = error.config
  if (
    !isAxiosError(error) ||
    error.response?.status !== 401 ||
    !originalRequest?.headers.Authorization
  ) {
    throw error
  }

  const refreshedToken = await genNewAccessToken()
  if (!refreshedToken) throw error

  await cookieStore.set('auth_token', refreshedToken.access_token)
  originalRequest.headers.Authorization = `Bearer ${refreshedToken.access_token}`
  return axios(originalRequest)
})

export const readStoredJobId = () => localStorage.getItem(JOB_ID_KEY)

export const clearStoredJobId = () => localStorage.removeItem(JOB_ID_KEY)

const storeJobId = (jobId: string) => localStorage.setItem(JOB_ID_KEY, jobId)

export const isNotFound = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 404

export const startProgramGeneration = async (programInput: ProgramOptions) => {
  const submission: ProgramSubmission = {
    ...programInput,
    freeLimitEnabled: !programInput.isLoggedIn && getExpireTime() !== null
  }

  const response = await programGenApi.post<{ job_id: string }>(
    '',
    submission
  )
  storeJobId(response.data.job_id)
  return response.data.job_id
}

export const getProgramJob = async (jobId: string) => {
  const response = await programGenApi.get<ProgramJob>(
    `/${encodeURIComponent(jobId)}`
  )
  return response.data
}

export const getLatestProgramJob = async () => {
  try {
    const response = await programGenApi.get<LatestProgramJob>('/latest')
    return response.data
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

// The stored job first, then (logged in) the account's latest, which covers other devices
export const findResumableJob = async (isLoggedIn: boolean) => {
  const storedJobId = readStoredJobId()
  if (storedJobId) {
    try {
      return { jobId: storedJobId, job: await getProgramJob(storedJobId) }
    } catch (error) {
      if (!isNotFound(error)) throw error
      clearStoredJobId()
    }
  }

  if (!isLoggedIn) return null
  const latest = await getLatestProgramJob()
  if (!latest) return null
  storeJobId(latest.job_id)
  return { jobId: latest.job_id, job: latest }
}

export const discardProgramJob = async (jobId: string | undefined) => {
  clearStoredJobId()
  if (!jobId) return
  try {
    await programGenApi.delete(`/${encodeURIComponent(jobId)}`)
  } catch (error) {
    // A job left behind still expires on its own after 24 hours
    console.error(error)
  }
}

// Counted when the program arrives, so a refresh or a failed job doesn't use up the free program
export const markFreeProgramUsed = () => {
  if (localStorage.getItem(USAGE_TIME_KEY)) return
  localStorage.setItem(
    USAGE_TIME_KEY,
    (new Date().getTime() + LIMIT_EXPIRATION_TIME).toString()
  )
}

export const getExpireTime = () => {
  const lastSetExpireTime = localStorage.getItem(USAGE_TIME_KEY)
  const currentTime = new Date()
  if (
    lastSetExpireTime &&
    currentTime.getTime() > parseInt(lastSetExpireTime)
  ) {
    localStorage.removeItem(USAGE_TIME_KEY)
    return null
  }

  return lastSetExpireTime
}
