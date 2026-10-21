import { createFileRoute } from '@tanstack/react-router'
import { ProgramFactoryPage } from '@/components/programFactory/ProgramFactoryPage'

export const Route = createFileRoute('/aiProgramFactory')({
  component: ProgramFactoryPage
})
