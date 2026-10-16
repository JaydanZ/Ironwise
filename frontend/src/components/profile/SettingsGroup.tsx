import { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { ChevronRight, LucideIcon } from 'lucide-react'

export const settingsCardClass =
  'overflow-hidden rounded-2xl border border-white/[0.04] bg-[#181818]'

interface SettingsGroupProps {
  label: string
  children: ReactNode
}

export const SettingsGroup = ({ label, children }: SettingsGroupProps) => (
  <ul
    aria-label={label}
    className={clsx(settingsCardClass, 'divide-y divide-white/[0.06]')}
  >
    {children}
  </ul>
)

interface SettingsRowProps {
  icon: LucideIcon
  label: string
  value?: ReactNode
  // Rows with a destination get a chevron and press feedback
  to?: '/training' | '/changePassword' | '/aiProgramFactory'
  // Push the next page in from the right, see the slide-left styles in index.css
  slide?: boolean
}

const rowClass = 'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left'

export const SettingsRow = ({
  icon: Icon,
  label,
  value,
  to,
  slide
}: SettingsRowProps) => {
  const content = (
    <>
      <Icon aria-hidden className="size-[1.125rem] shrink-0 text-neutral-400" />
      <span className="flex-1 text-[0.9375rem] text-neutral-100">{label}</span>
      {value !== undefined && (
        <span className="min-w-0 max-w-[55%] truncate text-right text-sm tabular-nums text-neutral-400">
          {value}
        </span>
      )}
      {to && (
        <ChevronRight
          aria-hidden
          className="-mr-1 size-[1.125rem] shrink-0 text-neutral-500"
        />
      )}
    </>
  )

  return (
    <li>
      {to ? (
        <Link
          to={to}
          viewTransition={slide ? { types: ['slide-left'] } : undefined}
          className={clsx(
            rowClass,
            'select-none outline-none transition-colors duration-150 ease-out-strong [-webkit-tap-highlight-color:transparent] focus-visible:bg-white/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-app-colors-300 active:bg-white/[0.06] [@media(hover:hover)]:hover:bg-white/[0.03]'
          )}
        >
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  )
}
