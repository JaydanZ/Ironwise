import { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { iconButtonClass } from './profileStyles'

interface PageDotsProps {
  label: string
  pageCount: number
  pageIndex: number
  onPageChange: (index: number) => void
  onPageIntent: (index: number) => void
}

const pagerArrowClass = cn(
  iconButtonClass,
  '[-webkit-tap-highlight-color:transparent] aria-disabled:pointer-events-none aria-disabled:opacity-30'
)

export const PageDots = ({
  label,
  pageCount,
  pageIndex,
  onPageChange,
  onPageIntent
}: PageDotsProps) => {
  const isFirst = pageIndex === 0
  const isLast = pageIndex === pageCount - 1

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft' && !isFirst) onPageChange(pageIndex - 1)
    if (event.key === 'ArrowRight' && !isLast) onPageChange(pageIndex + 1)
  }

  return (
    <nav
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="flex items-center justify-between gap-2 border-t border-neutral-800 px-2 py-1 sm:px-4"
    >
      <button
        type="button"
        onClick={() => !isFirst && onPageChange(pageIndex - 1)}
        aria-disabled={isFirst}
        aria-label="Previous page"
        className={pagerArrowClass}
      >
        <ChevronLeft aria-hidden />
      </button>

      <div className="flex min-w-0 flex-wrap items-center justify-center">
        {Array.from({ length: pageCount }, (_, index) => {
          const isCurrent = index === pageIndex
          return (
            <button
              key={index}
              type="button"
              onClick={() => onPageChange(index)}
              // Start loading a far page on hover so the click lands on data
              onPointerEnter={() => onPageIntent(index)}
              onFocus={() => onPageIntent(index)}
              aria-label={`Page ${index + 1} of ${pageCount}`}
              aria-current={isCurrent ? 'page' : undefined}
              className="group grid h-10 w-6 place-items-center rounded-md outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-1 focus-visible:ring-app-colors-300"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out-strong motion-reduce:transition-none',
                  isCurrent
                    ? 'w-4 bg-app-colors-300'
                    : 'w-1.5 bg-neutral-600 [@media(hover:hover)]:group-hover:bg-neutral-400'
                )}
              />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => !isLast && onPageChange(pageIndex + 1)}
        aria-disabled={isLast}
        aria-label="Next page"
        className={pagerArrowClass}
      >
        <ChevronRight aria-hidden />
      </button>
    </nav>
  )
}
