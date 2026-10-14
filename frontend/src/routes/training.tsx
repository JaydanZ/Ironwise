import { createFileRoute } from '@tanstack/react-router'
import clsx from 'clsx'
import { useGetProfileDataQuery } from '@/services/protectedRoutesAPI'
import { ProgramsList } from '@/components/profile/ProgramsList'
import { NextWorkout } from '@/components/profile/NextWorkout'
import { PreviousWorkouts } from '@/components/training/PreviousWorkouts'
import { Button } from '@/components/ui/button'
import { CreateProgramButton } from '@/components/programCreation/CreateProgramButton'
import {
  panelClass,
  primaryButtonClass
} from '@/components/profile/profileStyles'

export const Route = createFileRoute('/training')({
  component: RouteComponent
})

function RouteComponent() {
  const { data, isLoading, isError, isFetching, refetch } =
    useGetProfileDataQuery()

  const activeProgram = data?.active_program?.[0] ?? null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-8 sm:px-8 min-[800px]:pb-16 min-[800px]:pt-28">
      <header className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold leading-tight text-neutral-50 sm:text-4xl">
            Training
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Your next session, saved programs and workout log.
          </p>
        </div>
        <CreateProgramButton
          className={clsx(primaryButtonClass, 'self-start sm:self-auto')}
        />
      </header>

      {isError ? (
        <section role="alert" className={clsx(panelClass, 'px-4 py-8 sm:px-6')}>
          <p className="font-medium text-neutral-50">
            We couldn&rsquo;t load your programs
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
          <NextWorkout program={activeProgram} isLoading={isLoading} />
          <ProgramsList />
          <PreviousWorkouts />
        </div>
      )}
    </main>
  )
}
