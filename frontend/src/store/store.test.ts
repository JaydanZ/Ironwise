import { describe, expect, it, vi } from 'vitest'

// authSlice reads the cookie store at import time
vi.stubGlobal('cookieStore', {
  get: async () => null,
  set: async () => undefined,
  delete: async () => undefined
})

const { store } = await import('./store')
const { protectedApiSlice } = await import('@/services/protectedRoutesAPI')
const { userLogin, userLogout } = await import('@/features/auth/authSlice')

const seedHistory = () =>
  store.dispatch(
    protectedApiSlice.util.upsertQueryData(
      'getWorkoutHistory',
      { page: 0, limit: 10, q: '' },
      { workouts: [], total: 0, has_more: false }
    )
  )

const cachedHistory = () =>
  protectedApiSlice.endpoints.getWorkoutHistory.select({
    page: 0,
    limit: 10,
    q: ''
  })(store.getState()).data

describe('store auth listener', () => {
  it('clears cached API data on logout', async () => {
    await seedHistory()
    expect(cachedHistory()).toBeDefined()

    store.dispatch(userLogout.fulfilled(undefined, 'request-id'))
    expect(cachedHistory()).toBeUndefined()
  })

  it('clears cached API data on login', async () => {
    await seedHistory()
    store.dispatch(
      userLogin.fulfilled(
        {
          email: 'b@example.com',
          username: 'b',
          token_data: { access_token: 'token', token_type: 'bearer' },
          refresh_token: 'refresh'
        },
        'request-id',
        {} as never
      )
    )
    expect(cachedHistory()).toBeUndefined()
  })

  it('keeps cached data when logout fails', async () => {
    await seedHistory()
    store.dispatch(
      userLogout.rejected(null, 'request-id', undefined, {
        errorMessage: 'Network Error',
        errorCode: 'ERR_NETWORK'
      })
    )
    expect(cachedHistory()).toBeDefined()
  })
})
