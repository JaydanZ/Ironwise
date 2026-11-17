import { useState } from 'react'
import clsx from 'clsx'
import { Dumbbell } from 'lucide-react'
import { exerciseArtUrl } from './exerciseArt'
import { sessionImagePanelClass } from './sessionStyles'

export const ExerciseImage = ({ name }: { name: string }) => {
  const artUrl = exerciseArtUrl(name)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showArt = artUrl !== null && artUrl === loadedUrl
  const mask = `url("${artUrl}") center / contain no-repeat`

  return (
    <div
      role="img"
      aria-label={`${name} ${showArt ? 'illustration' : 'image placeholder'}`}
      className={clsx(
        sessionImagePanelClass,
        showArt ? 'p-2' : 'text-neutral-600'
      )}
    >
      {/* A CSS mask fires no load or error events, so this probe fetches the same URL in the same CORS mode to report both */}
      {artUrl && artUrl !== failedUrl && (
        <img
          src={artUrl}
          alt=""
          hidden
          crossOrigin="anonymous"
          ref={(img) => {
            // Cached art is ready now, so show it in this commit instead of flashing the placeholder
            if (img?.complete && img.naturalWidth > 0) setLoadedUrl(artUrl)
          }}
          onLoad={() => setLoadedUrl(artUrl)}
          onError={() => setFailedUrl(artUrl)}
        />
      )}
      {showArt ? (
        <div
          className="size-full bg-neutral-400"
          style={{ mask, WebkitMask: mask }}
        />
      ) : (
        <Dumbbell aria-hidden className="size-14" strokeWidth={1.5} />
      )}
    </div>
  )
}
