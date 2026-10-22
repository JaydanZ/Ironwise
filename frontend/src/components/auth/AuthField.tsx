import { ReactNode, useState } from 'react'
import { Label } from '@radix-ui/react-label'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AuthFieldProps {
  id: string
  label: string
  type: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  errors: unknown[]
  icon: ReactNode
  placeholder?: string
  autoComplete?: string
  labelAside?: ReactNode
}

export function AuthField({
  id,
  label,
  type,
  value,
  onChange,
  errors,
  icon,
  placeholder,
  autoComplete,
  labelAside
}: AuthFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const isPassword = type === 'password'
  const errorId = `${id}-error`
  const hasErrors = errors.length > 0

  return (
    <div className="grid gap-2">
      <div className="order-last flex items-center justify-end">
        <Label htmlFor={id} className="sr-only">
          {label}
        </Label>
        {labelAside}
      </div>
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 [&_svg]:size-[1.125rem]"
        >
          {icon}
        </span>
        <Input
          id={id}
          value={value}
          type={isPassword && isRevealed ? 'text' : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={hasErrors}
          aria-describedby={hasErrors ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'h-12 rounded-full border-white/[0.06] bg-neutral-900 pl-11 text-base shadow-none placeholder:text-neutral-500 focus-visible:ring-app-colors-300/60 md:text-base',
            isPassword && 'pr-12'
          )}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={isRevealed ? 'Hide password' : 'Show password'}
            aria-pressed={isRevealed}
            onClick={() => setIsRevealed((revealed) => !revealed)}
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-neutral-500 [-webkit-tap-highlight-color:transparent] hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-colors-300/60"
          >
            {isRevealed ? (
              <EyeOff aria-hidden className="size-[1.125rem]" />
            ) : (
              <Eye aria-hidden className="size-[1.125rem]" />
            )}
          </button>
        )}
      </div>
      {hasErrors && (
        <p id={errorId} className="text-red-500 text-sm px-4">
          {errors.join(', ')}
        </p>
      )}
    </div>
  )
}
