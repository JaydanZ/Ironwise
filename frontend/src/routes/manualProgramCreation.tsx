import { createFileRoute, redirect } from '@tanstack/react-router'
import { ManualProgramCreation } from '@/components/programCreation/ManualProgramCreation'

export const Route = createFileRoute('/manualProgramCreation')({
  component: RouteComponent,
  // Manual programs save straight to the user's account
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
  return (
    <main className="mx-auto flex w-full max-w-3xl justify-center px-4 pb-48 pt-4 sm:px-8 min-[800px]:pb-16 min-[800px]:pt-24">
      <ManualProgramCreation />
    </main>
  )
}
