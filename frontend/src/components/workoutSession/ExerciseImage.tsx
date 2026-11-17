import { useState } from 'react'
import clsx from 'clsx'
import { Dumbbell } from 'lucide-react'
import { exerciseArtUrl } from './exerciseArt'
import { sessionImagePanelClass } from './sessionStyles'

export const ExerciseImage = ({ name }: { name: string }) => {
  const artUrl = exerciseArtUrl(name)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (!artUrl || artUrl === failedUrl) {
    return (
      <div
        role="img"
        aria-label={`${name} image placeholder`}
        className={clsx(sessionImagePanelClass, 'text-neutral-600')}
      >
        <Dumbbell aria-hidden className="size-14" strokeWidth={1.5} />
      </div>
    )
  }

  const mask = `url("${artUrl}") center / contain no-repeat`

  return (
    <div
      role="img"
      aria-label={`${name} illustration`}
      className={clsx(sessionImagePanelClass, 'p-2')}
    >
      {/* A failed CSS mask fires no event, so this probe fetches the same URL in the same CORS mode to detect it */}
      <img
        src={artUrl}
        alt=""
        hidden
        crossOrigin="anonymous"
        onError={() => setFailedUrl(artUrl)}
      />
      <div
        className="size-full bg-neutral-400"
        style={{ mask, WebkitMask: mask }}
      />
    </div>
  )
}
