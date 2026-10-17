import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import clsx from 'clsx'
import {
  AnimatePresence,
  motion,
  PanInfo,
  useDragControls,
  useReducedMotion
} from 'motion/react'
import {
  useGetWorkoutHistoryQuery,
  usePrefetch
} from '@/services/protectedRoutesAPI'
import { WorkoutHistoryEntry } from '@/types/workoutSession'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  panelClass,
  panelHeaderClass,
  panelTitleClass,
  skeletonClass
} from '../profile/profileStyles'
import { PageDots } from '../profile/PageDots'
import { SearchBar } from '../profile/SearchBar'
import {
  normalizeSearchQuery,
  pageCountFor,
  rowsOnPage,
  SEARCH_DEBOUNCE_MS
} from '../profile/programSearch'
import {
  countSets,
  dateTile,
  formatSet,
  HISTORY_MAX_ITEMS,
  HISTORY_PAGE_SIZE,
  pluralize
} from './workoutHistory'

const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const
const SWIPE_DISTANCE_RATIO = 0.2
const SWIPE_VELOCITY = 400

const ghostButtonClass =
  'h-10 border border-neutral-700 px-4 text-sm font-medium text-neutral-200 transition-[transform,background-color,color] duration-150 ease-out-strong hover:bg-neutral-800/70 hover:text-neutral-50 active:scale-[0.97] disabled:opacity-40'

const contentInsetClass = 'sm:pl-[5.5rem]'

const SkeletonRows = ({ count }: { count: number }) =>
  Array.from({ length: count }, (_, index) => (
    <li
      key={index}
      aria-hidden
      className="flex min-h-[4.5rem] items-center gap-3 border-t border-neutral-800 px-4 py-3 first:border-t-0 sm:gap-4 sm:px-6"
    >
      <div className={clsx(skeletonClass, 'h-12 w-12 rounded-md')} />
      <div className="flex-1">
        <div className={clsx(skeletonClass, 'h-4 w-2/5')} />
        <div className={clsx(skeletonClass, 'mt-2 h-3 w-3/5')} />
      </div>
      <div className={clsx(skeletonClass, 'h-4 w-12')} />
    </li>
  ))

const HistorySkeleton = () => (
  <ul aria-busy="true" aria-label="Loading previous workouts">
    <SkeletonRows count={3} />
  </ul>
)

const WorkoutRow = memo(({ workout }: { workout: WorkoutHistoryEntry }) => {
  const tile = dateTile(workout.date)
  const setCount = countSets(workout)
  const title = workout.focus || workout.day || 'Workout'
  const meta = [workout.focus ? workout.day : null, workout.program_name]
    .filter(Boolean)
    .join(' / ')

  return (
    <AccordionItem
      value={workout.id}
      className="border-b-0 border-t border-neutral-800 first:border-t-0"
    >
      <AccordionTrigger className="group min-h-[4.5rem] min-w-0 gap-3 px-4 py-3 outline-none transition-colors hover:no-underline focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-app-colors-300 sm:gap-4 sm:px-6 [&>svg]:size-[1.125rem] [&>svg]:text-neutral-500 [&[data-state=open]>svg]:text-app-colors-300">
        <span
          aria-hidden
          className="flex size-12 shrink-0 flex-col items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/70 leading-none transition-colors duration-150 group-data-[state=open]:border-app-colors-300/40"
        >
          <span className="text-[0.6875rem] font-medium text-neutral-500">
            {tile.month}
          </span>
          <span className="mt-1 text-lg font-semibold tabular-nums text-neutral-50">
            {tile.day}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="sr-only">{tile.label}: </span>
          <span className="block truncate text-[0.9375rem] font-medium leading-snug text-neutral-50">
            {title}
          </span>
          {meta && (
            <span className="mt-0.5 block truncate text-sm font-normal text-neutral-400">
              {meta}
            </span>
          )}
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-sm font-medium tabular-nums text-neutral-300">
            {pluralize(setCount, 'set')}
          </span>
          {!workout.is_completed && (
            <span className="text-xs font-normal text-neutral-500">
              Finished early
            </span>
          )}
        </span>
      </AccordionTrigger>

      <AccordionContent
        className={clsx('px-4 pb-5 sm:px-6', contentInsetClass)}
      >
        {workout.exercises.length === 0 ? (
          <p className="text-sm text-neutral-400">No sets were logged.</p>
        ) : (
          <ol className="space-y-4">
            {workout.exercises.map((exercise, index) => (
              <li key={`${exercise.name}-${index}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium text-neutral-100">
                    {exercise.name}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-neutral-500">
                    {pluralize(exercise.sets.length, 'set')}
                  </p>
                </div>
                <ul
                  aria-label={`${exercise.name} sets`}
                  className="mt-2 flex flex-wrap gap-1.5"
                >
                  {exercise.sets.map((set) => (
                    <li
                      key={set.set_number}
                      className="rounded-md border border-neutral-800 bg-neutral-900/70 px-2 py-1 text-xs tabular-nums text-neutral-300"
                    >
                      <span className="sr-only">Set {set.set_number}: </span>
                      {formatSet(set)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </AccordionContent>
    </AccordionItem>
  )
})

WorkoutRow.displayName = 'WorkoutRow'

interface WorkoutPageRowsProps {
  pageIndex: number
  query: string
  expectedRows: number
}

// Each sliding page reads its own cache entry, so the outgoing page keeps its
// rows while the incoming one shows placeholders until its data arrives
const WorkoutPageRows = ({
  pageIndex,
  query,
  expectedRows
}: WorkoutPageRowsProps) => {
  const { data, isError, refetch } = useGetWorkoutHistoryQuery({
    page: pageIndex,
    limit: HISTORY_PAGE_SIZE,
    q: query
  })

  if (!data && isError) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <p role="alert" className="text-sm text-neutral-300">
          Couldn&rsquo;t load this page.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="-ml-2 mt-1 inline-flex h-10 items-center rounded-md px-2 text-sm font-medium text-app-colors-300 outline-none transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-neutral-800/70 focus-visible:ring-1 focus-visible:ring-app-colors-300"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <ul aria-hidden>
        <SkeletonRows count={expectedRows} />
      </ul>
    )
  }

  return data.workouts.map((workout) => (
    <WorkoutRow key={workout.id} workout={workout} />
  ))
}

export const PreviousWorkouts = () => {
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState({ index: 0, direction: 0 })
  const [isPaging, setIsPaging] = useState(false)
  const [pageHeight, setPageHeight] = useState<number | null>(null)
  const [openItem, setOpenItem] = useState('')
  const prefersReducedMotion = useReducedMotion()
  const dragControls = useDragControls()
  const pagerRef = useRef<HTMLDivElement>(null)
  const didDragRef = useRef(false)
  const prefetchHistory = usePrefetch('getWorkoutHistory', { ifOlderThan: 60 })

  // Every logged workout, unfiltered: drives the empty state and the count
  const allWorkouts = useGetWorkoutHistoryQuery({
    page: 0,
    limit: HISTORY_PAGE_SIZE,
    q: ''
  })
  // `data` holds the previous result while a new page or search loads, so the
  // dots and count stay put; `currentData` is only the result for these args
  const { data, currentData, isFetching } = useGetWorkoutHistoryQuery({
    page: page.index,
    limit: HISTORY_PAGE_SIZE,
    q: searchQuery
  })

  const pageIndex = page.index
  const workoutCount = allWorkouts.data?.total ?? 0
  const matchCount = data?.total ?? 0
  const reachableCount = Math.min(matchCount, HISTORY_MAX_ITEMS)
  const pageCount = pageCountFor(reachableCount, HISTORY_PAGE_SIZE)
  const isSearching = searchQuery !== ''
  const typedQuery = normalizeSearchQuery(query)
  const isSearchPending =
    typedQuery !== searchQuery || (isSearching && isFetching && !currentData)
  const showsStaleResults = isFetching && !currentData && pageIndex === 0

  // Only hit the server once typing pauses; clearing the search is immediate
  useEffect(() => {
    if (typedQuery === searchQuery) return
    const timer = setTimeout(
      () => {
        setSearchQuery(typedQuery)
        setPage({ index: 0, direction: 0 })
      },
      typedQuery ? SEARCH_DEBOUNCE_MS : 0
    )
    return () => clearTimeout(timer)
  }, [typedQuery, searchQuery])

  const prefetchPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= pageCount) return
      prefetchHistory({ page: index, limit: HISTORY_PAGE_SIZE, q: searchQuery })
    },
    [prefetchHistory, pageCount, searchQuery]
  )

  useEffect(() => {
    if (!currentData) return
    prefetchPage(pageIndex + 1)
    prefetchPage(pageIndex - 1)
  }, [currentData, pageIndex, prefetchPage])

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
    if (index === pageIndex || index < 0 || index >= pageCount) return
    setIsPaging(true)
    setPage({ index, direction: index > pageIndex ? 1 : -1 })
  }

  const handleSwipeEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    const width = pagerRef.current?.offsetWidth ?? 0
    const swiped =
      Math.abs(offset.x) > width * SWIPE_DISTANCE_RATIO ||
      Math.abs(velocity.x) > SWIPE_VELOCITY
    if (!swiped) return
    goToPage(offset.x < 0 ? pageIndex + 1 : pageIndex - 1)
  }

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
      data &&
      `${matchCount} ${matchCount === 1 ? 'workout' : 'workouts'} found.`,
    pageCount > 1 && `Page ${pageIndex + 1} of ${pageCount}.`
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section aria-labelledby="previous-workouts-title" className={panelClass}>
      <div className={panelHeaderClass}>
        <h2 id="previous-workouts-title" className={panelTitleClass}>
          Previous workouts
        </h2>
        {workoutCount > 0 && (
          <span className="text-sm tabular-nums text-neutral-400">
            {isSearching && data
              ? `${matchCount} of ${workoutCount}`
              : workoutCount}
          </span>
        )}
      </div>

      {allWorkouts.isLoading ? (
        <HistorySkeleton />
      ) : allWorkouts.isError && !allWorkouts.data ? (
        <div role="alert" className="px-4 py-8 sm:px-6">
          <p className="font-medium text-neutral-50">
            We couldn&rsquo;t load your workouts
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Check your connection, then try again.
          </p>
          <Button
            variant="ghost"
            onClick={() => allWorkouts.refetch()}
            disabled={allWorkouts.isFetching}
            className={clsx(ghostButtonClass, 'mt-4')}
          >
            {allWorkouts.isFetching ? 'Retrying...' : 'Try again'}
          </Button>
        </div>
      ) : workoutCount === 0 ? (
        <div className="px-4 py-8 sm:px-6">
          <p className="font-medium text-neutral-100">No workouts logged yet</p>
          <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-neutral-400">
            Finish a session from Next workout and it will show up here with
            every set you logged.
          </p>
        </div>
      ) : (
        <>
          <SearchBar
            placeholder="Search workouts"
            label="Search previous workouts by name, program or exercise"
            query={query}
            isPending={isSearchPending}
            onQueryChange={setQuery}
          />

          <p role="status" className="sr-only">
            {statusText}
          </p>

          {isSearching && data && matchCount === 0 ? (
            <div className="px-4 py-8 sm:px-6">
              <p className="break-words font-medium text-neutral-100">
                No workouts match &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                Try a workout name, program or exercise.
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
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
                animate={{ height: isPaging ? pageHeight ?? 'auto' : 'auto' }}
                transition={{
                  duration: isPaging && !prefersReducedMotion ? 0.4 : 0,
                  ease: EASE_OUT_STRONG
                }}
                aria-busy={isFetching}
                className={clsx(
                  'relative overflow-hidden transition-opacity duration-150',
                  showsStaleResults && 'opacity-60'
                )}
              >
                <AnimatePresence
                  initial={false}
                  mode="popLayout"
                  custom={page.direction}
                >
                  <motion.div
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
                    onAnimationComplete={(definition) => {
                      if (definition === 'center') setIsPaging(false)
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
                    className="w-full touch-pan-y"
                  >
                    <Accordion
                      type="single"
                      collapsible
                      value={openItem}
                      onValueChange={setOpenItem}
                    >
                      <WorkoutPageRows
                        pageIndex={pageIndex}
                        query={searchQuery}
                        expectedRows={
                          rowsOnPage(
                            pageIndex,
                            reachableCount,
                            HISTORY_PAGE_SIZE
                          ) || HISTORY_PAGE_SIZE
                        }
                      />
                    </Accordion>
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {pageCount > 1 && (
                <PageDots
                  label="Previous workouts pages"
                  pageCount={pageCount}
                  pageIndex={pageIndex}
                  onPageChange={goToPage}
                  onPageIntent={prefetchPage}
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
