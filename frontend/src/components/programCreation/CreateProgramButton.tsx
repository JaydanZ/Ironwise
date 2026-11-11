import { useNavigate } from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import { ArrowRight, ChevronDown, PencilLine, Sparkles } from 'lucide-react'
import { RootState } from '@/store/store'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '../ui/dropdown-menu'
import {
  menuCollisionPadding,
  menuContentClass,
  menuItemClass
} from './menuStyles'

const LARGE_BUTTON_CLASS =
  'group h-12 gap-2.5 rounded-md bg-app-colors-300 px-6 text-base font-semibold text-app-colors-500 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.6)] transition-[transform,background-color] duration-150 ease-out-strong hover:bg-[#3eff34] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-app-colors-300 focus-visible:ring-offset-2 focus-visible:ring-offset-app-colors-500 [&_svg]:size-[1.125rem]'

interface CreateProgramButtonProps {
  className?: string
  size?: 'default' | 'lg'
}

export function CreateProgramButton({
  className,
  size = 'default'
}: CreateProgramButtonProps) {
  const navigate = useNavigate()
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn)

  const buttonClass = cn(size === 'lg' && LARGE_BUTTON_CLASS, className)

  if (!isLoggedIn) {
    return (
      <Button
        className={buttonClass}
        onClick={() => navigate({ to: '/aiProgramFactory' })}
      >
        Create a Program
        <ArrowRight
          aria-hidden
          className="transition-transform duration-200 ease-out-strong [@media(hover:hover)]:group-hover:translate-x-0.5"
        />
      </Button>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {/* No press scale: the menu anchors to this button's measured box, so shrinking it shifts the menu */}
        <Button className={cn('group', buttonClass, 'active:scale-100')}>
          Create a Program
          <ChevronDown
            aria-hidden
            className="transition-transform duration-200 ease-out-strong group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={menuCollisionPadding}
        className={cn('w-[min(18rem,calc(100vw-2rem))]', menuContentClass)}
      >
        <DropdownMenuItem
          className={menuItemClass}
          onSelect={() => navigate({ to: '/aiProgramFactory' })}
        >
          <Sparkles aria-hidden className="mt-0.5 text-app-colors-300" />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">Generate with AI</span>
            <span className="text-sm text-neutral-400">
              Answer a few questions and get a full week built for you.
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={menuItemClass}
          onSelect={() => navigate({ to: '/manualProgramCreation' })}
        >
          <PencilLine aria-hidden className="mt-0.5 text-app-colors-300" />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">Build it yourself</span>
            <span className="text-sm text-neutral-400">
              Pick your own days, exercises, sets and reps.
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
