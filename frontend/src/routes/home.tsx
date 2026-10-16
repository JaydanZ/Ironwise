import { createFileRoute, redirect } from '@tanstack/react-router'
import clsx from 'clsx'
import { useGetProfileDataQuery } from '@/services/protectedRoutesAPI'
import { WorkoutStreakTracker } from '@/components/profile/WorkoutStreakTracker'
import { NextWorkout } from '@/components/profile/NextWorkout'
import { WeekStrip } from '@/components/home/WeekStrip'
import { ProgressPanel } from '@/components/home/ProgressPanel'
import { Button } from '@/components/ui/button'
import { panelClass, skeletonClass } from '@/components/profile/profileStyles'

export const Route = createFileRoute('/home')({
  component: RouteComponent,
  // Logged out visitors get the landing page instead
  beforeLoad: async () => {
    const tokenInStore = await cookieStore.get('auth_token')
    const userToken = tokenInStore ? tokenInStore?.value : null
    if (!userToken) {
      throw redirect({
        to: '/'
      })
    }
  }
})

function RouteComponent() {
  const { data, isLoading, isError, isFetching, refetch } =
    useGetProfileDataQuery()

  const activeProgram = data?.active_program?.[0] ?? null

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:px-8 min-[800px]:pb-16 min-[800px]:pt-28 lg:px-12">
      <header className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {isLoading ? (
            <>
              <div className={clsx(skeletonClass, 'h-9 w-56')} />
              <div className={clsx(skeletonClass, 'mt-3 h-4 w-40')} />
            </>
          ) : (
            <>
              <h1 className="truncate font-display text-3xl font-bold leading-tight text-neutral-50 sm:text-4xl">
                {data?.username ? `Hi, ${data.username}` : 'Welcome back'}
              </h1>
              {data?.email && (
                <p className="mt-1 truncate text-sm text-neutral-400">
                  {data.email}
                </p>
              )}
            </>
          )}
        </div>
      </header>

      {isError ? (
        <section role="alert" className={clsx(panelClass, 'px-4 py-8 sm:px-6')}>
          <p className="font-medium text-neutral-50">
            We couldn&rsquo;t load your training data
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Check your connection, then try again.
          </p>
          <Button
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 h-10 border border-neutral-700 px-4 text-neutral-100 transition-[transform,background-color] duration-150 hover:bg-neutral-800/70 active:scale-[0.97]"
          >
            {isFetching ? 'Retrying...' : 'Try again'}
          </Button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <WeekStrip
            programId={activeProgram?.id}
            structure={activeProgram?.program_structure}
            history={data?.workout_history}
            isLoading={isLoading}
          />
          <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-2">
            <NextWorkout program={activeProgram} isLoading={isLoading} />
            <ProgressPanel />
          </div>
          <div className="min-w-0">
            <WorkoutStreakTracker
              data={data?.workout_history}
              streak={data?.workout_streak}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </main>
  )
}
