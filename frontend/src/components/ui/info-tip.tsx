import { ReactNode, useId, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card'

interface InfoTipProps {
  // Names the button for screen readers, e.g. "About strength trend"
  label: string
  children: ReactNode
  className?: string
}

// Hover card ignores touch, so a tap opens it too, and a hidden copy of the
// text gives screen readers the same explanation
export const InfoTip = ({ label, children, className }: InfoTipProps) => {
  const [open, setOpen] = useState(false)
  const descriptionId = useId()

  return (
    <span className={cn('inline-flex align-middle', className)}>
      <HoverCard
        open={open}
        onOpenChange={setOpen}
        openDelay={0}
        closeDelay={100}
      >
        <HoverCardTrigger asChild>
          <button
            type="button"
            aria-label={label}
            aria-describedby={descriptionId}
            onClick={() => setOpen(true)}
            className="-m-2 inline-flex size-8 items-center justify-center rounded-full text-neutral-500 outline-none transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:text-neutral-200 focus-visible:text-neutral-200 focus-visible:ring-1 focus-visible:ring-app-colors-300 data-[state=open]:text-neutral-200"
          >
            <CircleHelp aria-hidden className="size-4" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="bottom"
          collisionPadding={16}
          className="w-64 max-w-[calc(100vw-2rem)] border-neutral-700 bg-neutral-900 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-neutral-300 shadow-lg shadow-black/40 data-[state=closed]:[animation-duration:75ms] data-[state=open]:[animation-duration:100ms] motion-reduce:animate-none"
        >
          {children}
        </HoverCardContent>
      </HoverCard>
      <span id={descriptionId} hidden>
        {children}
      </span>
    </span>
  )
}
