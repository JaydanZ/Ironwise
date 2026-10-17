// Mirrors backend/models/auth.py
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128
export const RESET_CODE_LENGTH = 6

// Counts code points like Python's len(), so an emoji is one character, not two
const characterCount = (value: string) => [...value].length

export const newPasswordError = (value: string) => {
  if (value.length === 0) return 'Password is required'
  if (characterCount(value) < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  if (characterCount(value) > MAX_PASSWORD_LENGTH)
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`
  return undefined
}

export const existingPasswordError = (value: string) => {
  if (value.length === 0) return 'Current password is required'
  if (characterCount(value) > MAX_PASSWORD_LENGTH) return 'Password is too long'
  return undefined
}

export const confirmPasswordError = (value: string, newPassword: string) => {
  if (value.length === 0) return 'Confirm your new password'
  if (value !== newPassword) return 'Passwords do not match'
  return undefined
}
