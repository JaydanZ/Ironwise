import { createFileRoute } from '@tanstack/react-router'
import clsx from 'clsx'
import {
  CalendarCheck,
  Dumbbell,
  Flame,
  KeyRound,
  Sparkles
} from 'lucide-react'
import { useGetProfileDataQuery } from '@/services/protectedRoutesAPI'
import { LogoutButton } from '@/components/profile/LogoutButton'
import {
  SettingsGroup,
  SettingsRow,
  settingsCardClass
} from '@/components/profile/SettingsGroup'
import { Button } from '@/components/ui/button'
import { skeletonClass } from '@/components/profile/profileStyles'

export const Route = createFileRoute('/profile')({
  component: RouteComponent
})

const plural = (count: number, word: string) =>
  `${count} ${count === 1 ? word : `${word}s`}`

const ProfileSkeleton = () => (
  <div aria-busy="true" aria-label="Loading profile" className="grid gap-4">
    <div className={clsx(settingsCardClass, 'flex items-center gap-4 p-4')}>
      <div className={clsx(skeletonClass, 'size-14 shrink-0 rounded-full')} />
      <div className="flex-1">
        <div className={clsx(skeletonClass, 'h-5 w-32')} />
        <div className={clsx(skeletonClass, 'mt-2 h-4 w-48 max-w-full')} />
      </div>
    </div>
    {[3, 1, 1].map((rows, group) => (
      <div
        key={group}
        className={clsx(settingsCardClass, 'divide-y divide-white/[0.06]')}
      >
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex min-h-14 items-center gap-3 px-4">
            <div className={clsx(skeletonClass, 'size-[1.125rem]')} />
            <div className={clsx(skeletonClass, 'h-4 w-32')} />
          </div>
        ))}
      </div>
    ))}
  </div>
)

function RouteComponent() {
  const { data, isLoading, isError, isFetching, refetch } =
    useGetProfileDataQuery()

  const activeProgram = data?.active_program?.[0] ?? null
  const streak = data?.workout_streak ?? 0
  const workoutsLogged =
    data?.workout_history?.filter((entry) => entry.has_worked_out).length ?? 0
  const initial = data?.username?.trim().charAt(0).toUpperCase() || '?'

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-32 pt-8 sm:px-8 min-[800px]:pb-16 min-[800px]:pt-28">
      <h1 className="pb-6 text-center font-display text-2xl font-light text-neutral-50">
        Profile
      </h1>

      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <div className="grid gap-4">
          {isError ? (
            <section role="alert" className={clsx(settingsCardClass, 'p-4')}>
              <p className="font-medium text-neutral-50">
                We couldn&rsquo;t load your profile
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
            <>
              <section
                aria-label="Account"
                className={clsx(
                  settingsCardClass,
                  'flex items-center gap-4 p-4'
                )}
              >
                <span
                  aria-hidden
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-app-colors-300 font-display text-2xl font-bold text-app-colors-500"
                >
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold leading-tight text-neutral-50">
                    {data?.username}
                  </p>
                  <p className="mt-1 truncate text-sm text-neutral-400">
                    {data?.email}
                  </p>
                </div>
              </section>

              <SettingsGroup label="Training">
                <SettingsRow
                  icon={Dumbbell}
                  label="Active program"
                  value={activeProgram?.program_name ?? 'None'}
                  to="/training"
                  slide
                />
                <SettingsRow
                  icon={Flame}
                  label="Workout streak"
                  value={plural(streak, 'day')}
                />
                <SettingsRow
                  icon={CalendarCheck}
                  label="Workouts logged"
                  value={workoutsLogged}
                />
              </SettingsGroup>
            </>
          )}

          <SettingsGroup label="Security">
            <SettingsRow
              icon={KeyRound}
              label="Change password"
              to="/changePassword"
            />
          </SettingsGroup>

          <SettingsGroup label="Programs">
            <SettingsRow
              icon={Sparkles}
              label="Generate a program"
              to="/aiProgramFactory"
            />
          </SettingsGroup>

          <div className="pt-4">
            <LogoutButton />
          </div>
        </div>
      )}
    </main>
  )
}
