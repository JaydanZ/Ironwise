import { ReactNode, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { SignalField } from '@/components/landing/SignalField'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type AuthRoute = '/' | '/login' | '/registerUser'

interface AuthLayoutProps {
  title: string
  description: string
  pageLabel: string
  backTo: AuthRoute
  switchPrompt: string
  switchLabel: string
  switchTo: AuthRoute
  error: string
  children: ReactNode
}

const FIELD_ORIGIN: [number, number] = [0.5, 0]

export function AuthLayout({
  title,
  description,
  pageLabel,
  backTo,
  switchPrompt,
  switchLabel,
  switchTo,
  error,
  children
}: AuthLayoutProps) {
  const headingRef = useRef<HTMLDivElement>(null)

  return (
    <main className="relative isolate flex min-h-dvh w-full flex-col overflow-hidden px-5 pb-[calc(max(env(safe-area-inset-bottom),0.5rem)+5.5rem)] min-[800px]:justify-center min-[800px]:pb-16 min-[800px]:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[max(88svh,36rem)] min-[800px]:h-[max(88svh,40rem)]"
      >
        <SignalField
          quietRef={headingRef}
          origin={FIELD_ORIGIN}
          intensity={0.85}
          interactive={false}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-25% via-app-colors-500/75 via-70% to-app-colors-500" />
      </div>

      <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col min-[800px]:flex-none">
        <header className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center pt-[max(env(safe-area-inset-top),1rem)]">
          <Link
            to={backTo}
            aria-label="Back"
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/40 text-neutral-200 backdrop-blur-md transition-[transform,color] duration-150 ease-out-strong [-webkit-tap-highlight-color:transparent] hover:text-neutral-50 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-colors-300/60 motion-reduce:active:scale-100"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <p className="text-center text-[0.95rem] font-medium text-neutral-100">
            {pageLabel}
          </p>
        </header>

        <div className="flex flex-1 flex-col justify-center py-6 min-[800px]:flex-none min-[800px]:py-0">
          <div ref={headingRef} className="text-center min-[800px]:mt-12">
            <h1 className="text-balance font-display text-[2.25rem] font-bold leading-[1.05] tracking-[-0.015em] text-neutral-50 min-[800px]:text-[2.75rem] [@media(max-height:720px)]:text-[2rem]">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-[34ch] text-pretty text-[0.95rem] leading-relaxed text-neutral-300 [text-shadow:0_1px_10px_rgb(0_0_0/0.9)]">
              {description}
            </p>
          </div>

          <div className="relative mt-10 [@media(max-height:720px)]:mt-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-12 -inset-y-10 -z-10 bg-[radial-gradient(closest-side,rgb(15_15_15/0.75)_60%,transparent)]"
            />
            {children}
          </div>

          {error.length > 0 && (
            <p role="alert" className="mt-4 text-center text-sm text-red-400">
              {error}
            </p>
          )}

          <p className="pt-8 text-center text-sm text-neutral-400 [@media(max-height:720px)]:pt-6">
            {switchPrompt}{' '}
            <Link
              to={switchTo}
              className="font-medium text-app-colors-300 underline decoration-app-colors-300/50 underline-offset-4 hover:decoration-app-colors-300"
            >
              {switchLabel}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

interface AuthSubmitButtonProps {
  isLoading: boolean
  children: ReactNode
}

export function AuthSubmitButton({
  isLoading,
  children
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isLoading}
      className="mt-7 h-12 w-full rounded-full bg-app-colors-300 text-base font-semibold text-app-colors-500 transition-[transform,background-color] duration-150 ease-out-strong hover:bg-[#a6f062] active:scale-[0.98] motion-reduce:active:scale-100 [&_svg]:size-[1.125rem] [@media(max-height:720px)]:mt-5"
    >
      {isLoading && <Spinner />} {children}
      {!isLoading && <ArrowRight aria-hidden />}
    </Button>
  )
}
