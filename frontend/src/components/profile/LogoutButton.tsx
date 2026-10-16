import { useState, ReactElement } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useAsyncDispatch } from '@/store/store'
import { userLogout } from '@/features/auth/authSlice'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

const logoutButtonClass =
  'inline-flex h-12 w-full select-none items-center justify-center gap-2 rounded-full bg-red-500 px-5 text-[0.9375rem] font-semibold text-neutral-950 transition-[transform,background-color] duration-150 ease-out-strong [-webkit-tap-highlight-color:transparent] active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-app-colors-500 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-red-400 [&_svg]:size-[1.125rem] [&_svg]:shrink-0'

export const LogoutButton = (): ReactElement => {
  const dispatch = useAsyncDispatch()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError(false)
    const result = await dispatch(userLogout())
    if (userLogout.fulfilled.match(result)) {
      navigate({ to: '/' })
      return
    }
    setIsLoggingOut(false)
    setLogoutError(true)
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (isLoggingOut) return
        setDialogOpen(open)
        if (!open) setLogoutError(false)
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={logoutButtonClass}>
          <LogOut aria-hidden />
          Log out
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg border-neutral-800 bg-[#141414]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-neutral-50">
            Log out of Ironwise?
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            You&rsquo;ll need to log in again to use Ironwise on this device.
            Your programs and progress stay saved to your account.
          </DialogDescription>
        </DialogHeader>
        {logoutError && (
          <p role="alert" className="text-sm text-red-400">
            Couldn&rsquo;t log out. Check your connection and try again.
          </p>
        )}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <DialogClose asChild>
            <Button
              variant="ghost"
              disabled={isLoggingOut}
              className="h-10 text-neutral-300 hover:bg-neutral-800/70 hover:text-neutral-50"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            className="h-10 gap-2 bg-red-600 text-red-50 transition-[transform,background-color] duration-150 ease-out-strong hover:bg-red-500 active:scale-[0.97] [&_svg]:size-4"
          >
            {isLoggingOut && <Spinner aria-hidden />}
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
