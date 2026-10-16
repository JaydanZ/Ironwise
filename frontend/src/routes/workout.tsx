import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { ArrowLeft } from 'lucide-react'
import {
  useGetProfileDataQuery,
  useGetProgramQuery
} from '@/services/protectedRoutesAPI'
import { WorkoutSession } from '@/components/workoutSession/WorkoutSession'
import { Button } from '@/components/ui/button'
import {
  panelClass,
  primaryButtonClass,
  skeletonClass
} from '@/components/profile/profileStyles'

interface WorkoutSearch {
  programId: string
  day: string
}

export const Route = createFileRoute('/workout')({
  validateSearch: (search: Record<string, unknown>): WorkoutSearch => ({
    programId: typeof search.programId === 'string' ? search.programId : '',
    day: typeof search.day === 'string' ? search.day : ''
  }),
  component: RouteComponent
})

const normalize = (value: string) => value.trim().toLowerCase()

const SessionSkeleton = () => (
  <div aria-busy="true" aria-label="Loading workout">
    <div className={clsx(skeletonClass, 'h-4 w-16')} />
    <div className={clsx(skeletonClass, 'mt-5 h-9 w-44')} />
    <div className={clsx(skeletonClass, 'mt-3 h-4 w-32')} />
    <div className={clsx(panelClass, 'mt-8')}>
      <div className="border-b border-neutral-800 px-4 py-4 sm:px-6">
        <div className={clsx(skeletonClass, 'h-5 w-24')} />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-t border-neutral-800 px-4 py-4 first:border-t-0 sm:px-6"
        >
          <div className={clsx(skeletonClass, 'size-7 rounded-full')} />
          <div className="flex-1">
            <div className={clsx(skeletonClass, 'h-4 w-1/2')} />
            <div className={clsx(skeletonClass, 'mt-2 h-3 w-16')} />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const SessionMessage = ({
  title,
  body,
  action
}: {
  title: string
  body: string
  action: React.ReactNode
}) => (
  <section
    role="alert"
    className={clsx(
      panelClass,
      'flex flex-col items-start gap-5 px-4 py-8 sm:px-6'
    )}
  >
    <div>
      <p className="text-lg font-semibold text-neutral-50">{title}</p>
      <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-neutral-400">
        {body}
      </p>
    </div>
    {action}
  </section>
)

function RouteComponent() {
  const navigate = useNavigate()
  const { programId, day } = Route.useSearch()
  const { data, isLoading, isError, isFetching, refetch } =
    useGetProfileDataQuery()

  const activeProgram =
    data?.active_program?.find((candidate) => candidate.id === programId) ??
    null
  // Usually the active program; any other saved program is fetched on its own
  const otherProgram = useGetProgramQuery(programId, {
    skip: !data || !programId || activeProgram !== null
  })
  const program = activeProgram ?? otherProgram.data ?? null

  const workout = useMemo(
    () =>
      program?.program_structure.find(
        (candidate) => normalize(candidate.day) === normalize(day)
      ) ?? null,
    [program, day]
  )

  const backToTraining = (
    <Button
      className={primaryButtonClass}
      onClick={() => navigate({ to: '/training' })}
    >
      <ArrowLeft aria-hidden />
      Back to training
    </Button>
  )

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-8 sm:px-8 min-[800px]:pb-16 min-[800px]:pt-28">
      {isLoading || otherProgram.isLoading ? (
        <SessionSkeleton />
      ) : isError ? (
        <SessionMessage
          title="We couldn’t load your workout"
          body="Check your connection, then try again."
          action={
            <Button
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-10 border border-neutral-700 px-4 text-neutral-100 transition-[transform,background-color] duration-150 hover:bg-neutral-800/70 active:scale-[0.97]"
            >
              {isFetching ? 'Retrying...' : 'Try again'}
            </Button>
          }
        />
      ) : !program || !workout ? (
        <SessionMessage
          title="Workout not found"
          body="This training day isn’t in your saved programs anymore. Start a workout from Training."
          action={backToTraining}
        />
      ) : workout.exercises.length === 0 ? (
        <SessionMessage
          title="No exercises on this day"
          body={`${workout.day} has no exercises to log. Pick another day from Training.`}
          action={backToTraining}
        />
      ) : (
        <WorkoutSession
          key={`${program.id}:${workout.day}`}
          programId={program.id}
          programName={program.program_name}
          workout={workout}
        />
      )}
    </main>
  )
}
