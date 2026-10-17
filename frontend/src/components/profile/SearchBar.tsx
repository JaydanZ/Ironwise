import { KeyboardEvent, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder: string
  label: string
  query: string
  isPending: boolean
  onQueryChange: (query: string) => void
}

export const SearchBar = ({
  placeholder,
  label,
  query,
  isPending,
  onQueryChange
}: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return
    if (query) {
      event.preventDefault()
      onQueryChange('')
    } else {
      inputRef.current?.blur()
    }
  }

  return (
    <div
      role="search"
      className="border-b border-neutral-800 px-4 py-3 sm:px-6"
    >
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center"
        >
          <Search
            className={cn(
              'col-start-1 row-start-1 size-4 text-neutral-500 transition-[opacity,transform] duration-150 ease-out-strong',
              isPending && 'scale-50 opacity-0'
            )}
          />
          <span
            className={cn(
              'col-start-1 row-start-1 transition-opacity duration-150',
              isPending ? 'opacity-100 delay-100' : 'opacity-0'
            )}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="block size-4 animate-[spin_0.7s_linear_infinite] will-change-transform"
            >
              <circle
                cx="8"
                cy="8"
                r="6.25"
                stroke="currentColor"
                strokeWidth="1.75"
                className="text-neutral-700"
              />
              <path
                d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="text-app-colors-300"
              />
            </svg>
          </span>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-11 w-full appearance-none rounded-md border border-neutral-800 bg-neutral-900/60 pl-9 pr-11 text-base text-neutral-50 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-neutral-500 focus-visible:border-app-colors-300/60 focus-visible:ring-1 focus-visible:ring-app-colors-300/60 sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="absolute right-0.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 outline-none transition-[transform,color] duration-150 ease-out-strong [-webkit-tap-highlight-color:transparent] hover:text-neutral-50 focus-visible:ring-1 focus-visible:ring-app-colors-300 active:scale-[0.9] sm:size-9 [&_svg]:size-4"
          >
            <X aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
