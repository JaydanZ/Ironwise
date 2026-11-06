import { PointerEvent, TouchEvent, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { Exercise } from '@/types/programCreation'
import { SetEntry } from '@/types/workoutSession'
import { isExerciseComplete, isSetComplete } from '@/hooks/useWorkoutSession'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const HOLD_MS = 450
const HOLD_MOVE_TOLERANCE_PX = 10

const useLongPress = (onHold: () => void, onTap: () => void) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef({ x: 0, y: 0 })
  const held = useRef(false)

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => cancel, [])

  return {
    onPointerDown: (event: PointerEvent) => {
      held.current = false
      origin.current = { x: event.clientX, y: event.clientY }
      cancel()
      timer.current = setTimeout(() => {
        timer.current = null
        held.current = true
        onHold()
      }, HOLD_MS)
    },
    onPointerMove: (event: PointerEvent) => {
      const moved = Math.hypot(
        event.clientX - origin.current.x,
        event.clientY - origin.current.y
      )
      if (moved > HOLD_MOVE_TOLERANCE_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onTouchEnd: (event: TouchEvent) => {
      if (held.current) event.preventDefault()
    },
    onClick: () => {
      // The click that ends a hold must not also jump to the next exercise
      if (held.current) {
        held.current = false
        return
      }
      onTap()
    },
    onContextMenu: (event: { preventDefault: () => void }) =>
      event.preventDefault()
  }
}

interface ExerciseSwitcherProps {
  exercises: Exercise[]
  entries: SetEntry[][]
  currentIndex: number
  nextIndex: number | null
  onSelect: (index: number) => void
}

export const ExerciseSwitcher = ({
  exercises,
  entries,
  currentIndex,
  nextIndex,
  onSelect
}: ExerciseSwitcherProps) => {
  const [open, setOpen] = useState(false)
  const openedByTouch = useRef(false)
  const switcherButton = useRef<HTMLButtonElement>(null)

  const openList = () => {
    openedByTouch.current = true
    setOpen(true)
  }

  const press = useLongPress(openList, () => {
    if (nextIndex === null) openList()
    else onSelect(nextIndex)
  })

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <div className="relative flex min-w-0 justify-end">
        <button
          type="button"
          aria-label={
            nextIndex === null
              ? 'Show exercises'
              : `Next exercise: ${exercises[nextIndex].name}`
          }
          ref={switcherButton}
          {...press}
          className="min-h-11 min-w-0 touch-none select-none rounded-md text-right text-sm text-neutral-500 outline-none transition-colors duration-150 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] focus-visible:ring-1 focus-visible:ring-app-colors-300 active:text-neutral-300"
        >
          {nextIndex === null ? (
            'Exercises'
          ) : (
            <>
              <span className="block text-xs leading-tight">Next:</span>
              <span className="block truncate leading-tight">
                {exercises[nextIndex].name}
              </span>
            </>
          )}
        </button>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="sr-only bottom-0 right-0 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-100 focus-visible:not-sr-only focus-visible:absolute"
          >
            All exercises
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        onInteractOutside={(event) => {
          if (switcherButton.current?.contains(event.target as Node))
            event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          if (openedByTouch.current) event.preventDefault()
          openedByTouch.current = false
        }}
        className="max-h-[60dvh] w-[min(18rem,calc(100vw-2rem))] border-neutral-800 bg-[#141414] font-inter text-neutral-100"
      >
        {exercises.map((exercise, index) => {
          const sets = entries[index]
          const current = index === currentIndex
          return (
            <DropdownMenuItem
              key={`${exercise.name}-${index}`}
              aria-current={current ? 'true' : undefined}
              onSelect={() => onSelect(index)}
              className={clsx(
                'min-h-11 justify-between gap-3 focus:bg-neutral-800 focus:text-neutral-50',
                current && 'text-app-colors-300 focus:text-app-colors-300'
              )}
            >
              <span className="min-w-0">{exercise.name}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-neutral-400">
                {sets.filter(isSetComplete).length}/{sets.length}
                {isExerciseComplete(sets) && (
                  <Check
                    aria-label="Complete"
                    className="text-app-colors-300"
                  />
                )}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
