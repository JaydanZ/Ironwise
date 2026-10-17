import { isAxiosError } from 'axios'

// Reads errors from both axios calls and RTK Query mutations
export const authErrorMessage = (error: unknown, fallback: string) => {
  let status: unknown
  let detail: unknown

  if (isAxiosError(error)) {
    if (!error.response)
      return 'Can’t reach the server. Check your connection and try again.'
    status = error.response.status
    detail = error.response.data?.detail
  } else if (error && typeof error === 'object' && 'status' in error) {
    status = error.status
    detail = (error as { data?: { detail?: unknown } }).data?.detail
  }

  // Rate limiter 429s carry no detail; the account lockout's does
  if (status === 429 && typeof detail !== 'string')
    return 'Too many attempts. Wait a minute and try again.'
  // 422 details are lists of field errors, not readable messages
  if (typeof detail === 'string') return detail
  return fallback
}
