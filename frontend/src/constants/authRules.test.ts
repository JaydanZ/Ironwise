import { describe, expect, it } from 'vitest'
import {
  confirmPasswordError,
  existingPasswordError,
  newPasswordError
} from './authRules'

describe('newPasswordError', () => {
  it('requires a password', () => {
    expect(newPasswordError('')).toBe('Password is required')
  })

  it('enforces 8 to 128 characters', () => {
    expect(newPasswordError('x'.repeat(7))).toMatch(/at least 8/)
    expect(newPasswordError('x'.repeat(8))).toBeUndefined()
    expect(newPasswordError('x'.repeat(128))).toBeUndefined()
    expect(newPasswordError('x'.repeat(129))).toMatch(/at most 128/)
  })

  it('counts an emoji as one character, like the backend', () => {
    expect(newPasswordError('💪'.repeat(8))).toBeUndefined()
    expect(newPasswordError('💪'.repeat(128))).toBeUndefined()
  })

  it('does not trim spaces before counting', () => {
    expect(newPasswordError('       a')).toBeUndefined()
  })
})

describe('existingPasswordError', () => {
  it('accepts short legacy passwords but not empty or oversized ones', () => {
    expect(existingPasswordError('short')).toBeUndefined()
    expect(existingPasswordError('')).toBe('Current password is required')
    expect(existingPasswordError('x'.repeat(129))).toBe('Password is too long')
  })
})

describe('confirmPasswordError', () => {
  it('compares exactly, including whitespace', () => {
    expect(confirmPasswordError('secret-pass ', 'secret-pass ')).toBeUndefined()
    expect(confirmPasswordError('secret-pass', 'secret-pass ')).toBe(
      'Passwords do not match'
    )
  })
})
