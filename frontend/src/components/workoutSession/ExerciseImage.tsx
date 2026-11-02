import { Dumbbell } from 'lucide-react'

export const ExerciseImage = ({ name }: { name: string }) => (
  <div
    role="img"
    aria-label={`${name} image placeholder`}
    className="flex h-[28dvh] max-h-64 min-h-32 w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/70 text-neutral-600"
  >
    <Dumbbell aria-hidden className="size-14" strokeWidth={1.5} />
  </div>
)
