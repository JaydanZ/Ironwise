import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import clsx from 'clsx'
import { ArrowLeft } from 'lucide-react'
import { useGetProgramQuery } from '@/services/protectedRoutesAPI'
import { ManualProgramCreation } from '@/components/programCreation/ManualProgramCreation'
import { panelClass } from '@/components/profile/profileStyles'
import { Spinner } from '@/components/ui/spinner'

export const Route = createFileRoute('/editProgram/$programId')({
  component: RouteComponent,
  // Programs belong to the user's account
  beforeLoad: async () => {
    const tokenInStore = await cookieStore.get('auth_token')
    const userToken = tokenInStore ? tokenInStore?.value : null
    if (!userToken) {
      throw redirect({
        to: '/login'
      })
    }
  }
})

function RouteComponent() {
  const { programId } = Route.useParams()
  const { data: program, isLoading, error } = useGetProgramQuery(programId)
  // A 404 means the program is gone; anything else is worth retrying
  const isError =
    error !== undefined && !('status' in error && error.status === 404)

  return (
    <main className="mx-auto flex w-full max-w-3xl justify-center px-4 pb-32 pt-8 sm:px-8 min-[800px]:pb-16 min-[800px]:pt-28">
      {program ? (
        <ManualProgramCreation key={program.id} program={program} />
      ) : isLoading ? (
        <div className="flex w-full justify-center py-16 text-neutral-400">
          <Spinner aria-label="Loading program" />
        </div>
      ) : (
        <section
          role="alert"
          className={clsx(panelClass, 'w-full px-4 py-8 sm:px-6')}
        >
          <p className="font-medium text-neutral-50">
            {isError
              ? 'We couldn’t load this program'
              : 'This program doesn’t exist'}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            {isError
              ? 'Check your connection, then try again.'
              : 'It may have been deleted.'}
          </p>
          <Link
            to="/training"
            className="-ml-2 mt-4 inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-neutral-400 outline-none transition-colors duration-150 hover:text-app-colors-300 focus-visible:ring-1 focus-visible:ring-app-colors-300"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to Training
          </Link>
        </section>
      )}
    </main>
  )
}
