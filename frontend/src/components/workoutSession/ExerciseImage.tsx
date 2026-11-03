import clsx from 'clsx'
import { Dumbbell } from 'lucide-react'
import { sessionImagePanelClass } from './sessionStyles'

export const ExerciseImage = ({ name }: { name: string }) => (
  <div
    role="img"
    aria-label={`${name} image placeholder`}
    className={clsx(sessionImagePanelClass, 'text-neutral-600')}
  >
    <Dumbbell aria-hidden className="size-14" strokeWidth={1.5} />
  </div>
)
