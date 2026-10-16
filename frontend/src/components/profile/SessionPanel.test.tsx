// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { userLogout } from '@/features/auth/authSlice'
import { SessionPanel } from './SessionPanel'

const navigate = vi.fn()
const dispatch = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate
}))
vi.mock('@/store/store', () => ({ useAsyncDispatch: () => dispatch }))
vi.mock('@/features/auth/authSlice', () => {
  const userLogout = Object.assign(
    vi.fn(() => ({ type: 'auth/logout' })),
    {
      fulfilled: {
        match: (action: { type: string }) => action.type === 'fulfilled'
      }
    }
  )
  return { userLogout }
})

const openDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
  return screen.findByRole('dialog')
}

describe('SessionPanel', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('asks for confirmation before logging out', async () => {
    render(<SessionPanel />)
    const dialog = await openDialog()

    expect(
      within(dialog).getByRole('heading', { name: 'Log out of Ironwise?' })
    ).toBeTruthy()
    expect(userLogout).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('stays logged in when cancelled', async () => {
    render(<SessionPanel />)
    const dialog = await openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(dispatch).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('logs out and leaves once confirmed', async () => {
    dispatch.mockResolvedValue({ type: 'fulfilled' })
    render(<SessionPanel />)
    const dialog = await openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }))
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('keeps the dialog open with an error when logout fails', async () => {
    dispatch.mockResolvedValue({ type: 'rejected' })
    render(<SessionPanel />)
    const dialog = await openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log out' }))

    expect(await within(dialog).findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(navigate).not.toHaveBeenCalled()
  })
})
