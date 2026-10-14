import {
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
  KeyboardEvent,
  ReactElement
} from 'react'
import clsx from 'clsx'
import { Link } from '@tanstack/react-router'
import {
  AnimatePresence,
  motion,
  PanInfo,
  useDragControls,
  useReducedMotion
} from 'motion/react'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  Power,
  Search,
  Trash2,
  X
} from 'lucide-react'
import { setProgramActive, deleteProgram } from '@/services/programsAPI'
import { WorkoutProgram } from '@/types/programCreation'
import { toast } from '@/hooks/use-toast'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  iconButtonClass,
  panelClass,
  panelHeaderClass,
  panelTitleClass,
  skeletonClass
} from './profileStyles'
import { orderProgramsActiveFirst } from './programOrder'
import {
  buildSearchIndex,
  paginate,
  PROGRAMS_PER_PAGE,
  searchPrograms
} from './programSearch'

const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const
// A swipe pages over once it travels this share of the width, or is flicked
const SWIPE_DISTANCE_RATIO = 0.2
const SWIPE_VELOCITY = 400

interface ProgramRowProps {
  program: WorkoutProgram
  isActive: boolean
  setActive: (program: WorkoutProgram) => Promise<boolean>
  deleteProgram: (programId: string) => Promise<boolean>
}

interface ProgramsListProps {
  programs: WorkoutProgram[] | null
  activeProgram: WorkoutProgram[] | null
  refreshProgramsList: () => void
  isLoading?: boolean
}

export const ProgramRow = memo((props: ProgramRowProps): ReactElement => {
  const [isActivating, setIsActivating] = useState(false)
  const [activateError, setActivateError] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const dayCount = props.program.program_structure.length

  const handleSetActive = async () => {
    setIsActivating(true)
    setActivateError(false)
    const activated = await props.setActive(props.program)
    setIsActivating(false)
    if (!activated) setActivateError(true)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(false)
    const deleted = await props.deleteProgram(props.program.id)
    setIsDeleting(false)
    if (deleted) setDialogOpen(false)
    else setDeleteError(true)
  }

  return (
    <li className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 sm:px-6">
      <div className="min-w-0 flex-1">
        <Link
          to="/editProgram/$programId"
          params={{ programId: props.program.id }}
          title="Edit program"
          className="line-clamp-2 rounded-sm font-medium leading-snug text-neutral-50 underline-offset-4 outline-none transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-app-colors-300 [@media(hover:hover)]:hover:text-app-colors-300 [@media(hover:hover)]:hover:underline"
        >
          {props.program.program_name}
        </Link>
        <p className="mt-0.5 text-sm text-neutral-400">
          {props.isActive && (
            <span className="font-medium text-app-colors-300">Active · </span>
          )}
          {dayCount} {dayCount === 1 ? 'day' : 'days'} a week
        </p>
        {activateError && (
          <p role="alert" className="mt-1 text-sm text-red-400">
            Couldn&rsquo;t set this as active. Try again.
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleSetActive}
          disabled={props.isActive || isActivating}
          aria-pressed={props.isActive}
          aria-label={
            props.isActive
              ? `${props.program.program_name} is your active program`
              : `Set ${props.program.program_name} as active`
          }
          title={props.isActive ? 'Active program' : 'Set as active'}
          className={cn(
            iconButtonClass,
            'text-neutral-500 hover:text-neutral-300',
            props.isActive && 'disabled:opacity-100'
          )}
        >
          <Power
            aria-hidden
            className={cn(
              'transition-[color,filter] duration-200 ease-out-strong',
              props.isActive &&
                'text-app-colors-300 [filter:brightness(1.15)_drop-shadow(0_0_2px_rgba(148,234,67,0.9))_drop-shadow(0_0_8px_rgba(148,234,67,0.6))]',
              isActivating && 'animate-pulse'
            )}
          />
        </button>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setDeleteError(false)
          }}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`Delete ${props.program.program_name}`}
              title="Delete program"
              className={cn(
                iconButtonClass,
                'hover:bg-red-500/10 hover:text-red-400'
              )}
            >
              <Trash2 aria-hidden />
            </button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg border-neutral-800 bg-[#141414]">
            <DialogHeader className="text-left">
              <DialogTitle className="text-neutral-50">
                Delete this program?
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                &ldquo;{props.program.program_name}&rdquo; will be removed from
                your saved programs. This can&rsquo;t be undone.
              </DialogDescription>
            </DialogHeader>
            {deleteError && (
              <p role="alert" className="text-sm text-red-400">
                Couldn&rsquo;t delete the program. Check your connection and try
                again.
              </p>
            )}
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  className="h-10 text-neutral-300 hover:bg-neutral-800/70 hover:text-neutral-50"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-10 bg-red-600 text-red-50 transition-[transform,background-color] duration-150 ease-out-strong hover:bg-red-500 active:scale-[0.97]"
              >
                {isDeleting ? 'Deleting...' : 'Delete program'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </li>
  )
})

ProgramRow.displayName = 'ProgramRow'

const ProgramsSkeleton = () => (
  <ul aria-hidden className="divide-y divide-neutral-800">
    {Array.from({ length: 3 }).map((_, index) => (
      <li
        key={index}
        className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 sm:px-6"
      >
        <div className="flex-1">
          <div className={clsx(skeletonClass, 'h-4 w-2/5')} />
          <div className={clsx(skeletonClass, 'mt-2 h-3 w-24')} />
        </div>
        <div className={clsx(skeletonClass, 'size-8')} />
        <div className={clsx(skeletonClass, 'size-8')} />
      </li>
    ))}
  </ul>
)

interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
}

const SearchBar = ({ query, onQueryChange }: SearchBarProps) => {
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
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search programs"
          aria-label="Search saved programs by name"
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

interface PageDotsProps {
  pageCount: number
  pageIndex: number
  onPageChange: (index: number) => void
}

const pagerArrowClass = cn(
  iconButtonClass,
  '[-webkit-tap-highlight-color:transparent] aria-disabled:pointer-events-none aria-disabled:opacity-30'
)

const PageDots = ({ pageCount, pageIndex, onPageChange }: PageDotsProps) => {
  const isFirst = pageIndex === 0
  const isLast = pageIndex === pageCount - 1

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft' && !isFirst) onPageChange(pageIndex - 1)
    if (event.key === 'ArrowRight' && !isLast) onPageChange(pageIndex + 1)
  }

  return (
    <nav
      aria-label="Saved programs pages"
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

export const ProgramsList = (props: ProgramsListProps): ReactElement => {
  const [optimisticActiveId, setOptimisticActiveId] = useState<string | null>(
    null
  )
  const [query, setQuery] = useState('')
  const [page, setPage] = useState({ index: 0, direction: 0 })
  const prefersReducedMotion = useReducedMotion()
  const dragControls = useDragControls()
  const pagerRef = useRef<HTMLDivElement>(null)
  const didDragRef = useRef(false)
  const [pageHeight, setPageHeight] = useState<number | null>(null)
  const { refreshProgramsList } = props

  // Typing stays instant; filtering the list follows at React's lower priority
  const deferredQuery = useDeferredValue(query)

  const activeProgramId =
    optimisticActiveId ?? props.activeProgram?.[0]?.id ?? null
  const programCount = props.programs?.length ?? 0

  const searchIndex = useMemo(
    () =>
      buildSearchIndex(
        orderProgramsActiveFirst(props.programs ?? [], activeProgramId)
      ),
    [props.programs, activeProgramId]
  )
  const matchingPrograms = useMemo(
    () => searchPrograms(searchIndex, deferredQuery),
    [searchIndex, deferredQuery]
  )
  const pages = useMemo(
    () => paginate(matchingPrograms, PROGRAMS_PER_PAGE),
    [matchingPrograms]
  )

  const pageIndex = Math.min(page.index, Math.max(pages.length - 1, 0))
  const pageCount = pages.length
  const isSearching = deferredQuery.trim().length > 0
  const hasPages = pageCount > 0

  useLayoutEffect(() => {
    const pageNode = pagerRef.current?.querySelector<HTMLElement>(
      `[data-page="${pageIndex}"]`
    )
    if (!pageNode) return
    const observer = new ResizeObserver(() =>
      setPageHeight(pageNode.offsetHeight)
    )
    observer.observe(pageNode)
    return () => observer.disconnect()
  }, [pageIndex, hasPages])

  const goToPage = (index: number) => {
    if (index === pageIndex) return
    setPage({ index, direction: index > pageIndex ? 1 : -1 })
  }

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setPage({ index: 0, direction: 0 })
  }

  const handleSwipeEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    const width = pagerRef.current?.offsetWidth ?? 0
    const swiped =
      Math.abs(offset.x) > width * SWIPE_DISTANCE_RATIO ||
      Math.abs(velocity.x) > SWIPE_VELOCITY
    if (!swiped) return
    if (offset.x < 0 && pageIndex < pageCount - 1) goToPage(pageIndex + 1)
    if (offset.x > 0 && pageIndex > 0) goToPage(pageIndex - 1)
  }

  const handleSetActive = useCallback(
    async (program: WorkoutProgram) => {
      try {
        const { program_id } = await setProgramActive(program)
        setOptimisticActiveId(program_id)
        toast({
          variant: 'success',
          title: 'Active program updated',
          description: `${program.program_name} is now your active program.`
        })
        refreshProgramsList()
        return true
      } catch (error) {
        console.error(error)
        return false
      }
    },
    [refreshProgramsList]
  )

  const handleDeleteProgram = useCallback(
    async (programId: string) => {
      try {
        await deleteProgram(programId)
        refreshProgramsList()
        return true
      } catch (error) {
        console.error(error)
        return false
      }
    },
    [refreshProgramsList]
  )

  const pageVariants = {
    enter: (direction: number) =>
      prefersReducedMotion || direction === 0
        ? { x: 0, opacity: 0 }
        : { x: `${direction * 100}%`, opacity: 0.4 },
    center: { x: 0, opacity: 1 },
    exit: (direction: number) =>
      prefersReducedMotion || direction === 0
        ? { x: 0, opacity: 0 }
        : { x: `${direction * -100}%`, opacity: 0.4 }
  }

  const statusText = [
    isSearching &&
      `${matchingPrograms.length} ${
        matchingPrograms.length === 1 ? 'program' : 'programs'
      } found.`,
    pageCount > 1 && `Page ${pageIndex + 1} of ${pageCount}.`
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section aria-labelledby="programs-title" className={panelClass}>
      <div className={panelHeaderClass}>
        <h2 id="programs-title" className={panelTitleClass}>
          Saved programs
        </h2>
        {!props.isLoading && programCount > 0 && (
          <span className="text-sm tabular-nums text-neutral-400">
            {isSearching
              ? `${matchingPrograms.length} of ${programCount}`
              : programCount}
          </span>
        )}
      </div>

      {props.isLoading ? (
        <ProgramsSkeleton />
      ) : programCount === 0 ? (
        <div className="px-4 py-8 sm:px-6">
          <p className="font-medium text-neutral-100">No saved programs</p>
          <p className="mt-1 max-w-[42ch] text-sm leading-relaxed text-neutral-400">
            Programs you save from the generator appear here. Set one as active
            to see your next workout.
          </p>
        </div>
      ) : (
        <>
          <SearchBar query={query} onQueryChange={handleQueryChange} />

          <p role="status" className="sr-only">
            {statusText}
          </p>

          {pageCount === 0 ? (
            <div className="px-4 py-8 sm:px-6">
              <p className="break-words font-medium text-neutral-100">
                No programs match &ldquo;{deferredQuery.trim()}&rdquo;
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                Check the spelling or try part of the name.
              </p>
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                className="-ml-2 mt-2 inline-flex h-10 items-center rounded-md px-2 text-sm font-medium text-app-colors-300 outline-none transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-neutral-800/70 focus-visible:ring-1 focus-visible:ring-app-colors-300"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              <motion.div
                ref={pagerRef}
                initial={false}
                animate={{ height: pageHeight ?? 'auto' }}
                transition={{
                  duration:
                    page.direction === 0 || prefersReducedMotion ? 0 : 0.4,
                  ease: EASE_OUT_STRONG
                }}
                className="relative overflow-hidden"
              >
                <AnimatePresence
                  initial={false}
                  mode="popLayout"
                  custom={page.direction}
                >
                  <motion.ul
                    key={pageIndex}
                    data-page={pageIndex}
                    custom={page.direction}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { duration: 0.4, ease: EASE_OUT_STRONG },
                      opacity: { duration: 0.2, ease: 'easeOut' }
                    }}
                    drag={pageCount > 1 ? 'x' : false}
                    dragListener={false}
                    dragControls={dragControls}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{
                      left: pageIndex < pageCount - 1 ? 0.6 : 0.1,
                      right: pageIndex > 0 ? 0.6 : 0.1
                    }}
                    dragDirectionLock
                    onPointerDownCapture={(event) => {
                      didDragRef.current = false
                      if (event.pointerType !== 'mouse')
                        dragControls.start(event)
                    }}
                    onDragStart={() => {
                      didDragRef.current = true
                    }}
                    onDragEnd={handleSwipeEnd}
                    onClickCapture={(event) => {
                      if (didDragRef.current) {
                        event.preventDefault()
                        event.stopPropagation()
                      }
                    }}
                    className="w-full touch-pan-y divide-y divide-neutral-800"
                  >
                    {pages[pageIndex].map((program) => (
                      <ProgramRow
                        program={program}
                        key={program.id}
                        isActive={program.id === activeProgramId}
                        setActive={handleSetActive}
                        deleteProgram={handleDeleteProgram}
                      />
                    ))}
                  </motion.ul>
                </AnimatePresence>
              </motion.div>

              {pageCount > 1 && (
                <PageDots
                  pageCount={pageCount}
                  pageIndex={pageIndex}
                  onPageChange={goToPage}
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
