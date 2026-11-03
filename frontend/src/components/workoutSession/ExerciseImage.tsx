import { Dumbbell } from 'lucide-react'

// The huge shrink factor makes the image give up space before the set list does
export const ExerciseImage = ({ name }: { name: string }) => (
  <div
    role="img"
    aria-label={`${name} image placeholder`}
    className="flex h-[28dvh] max-h-64 min-h-16 w-full shrink-[10000] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/70 text-neutral-600"
  >
    <Dumbbell aria-hidden className="size-14" strokeWidth={1.5} />
  </div>
)
