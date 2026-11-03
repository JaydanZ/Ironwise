import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { ArrowLeft } from 'lucide-react'
import useIsMobile from '@/hooks/useIsMobile'
import { useHideSiteNav } from '@/hooks/useHideSiteNav'
import { panelClass, skeletonClass } from '../profile/profileStyles'
import {
  sessionBackLinkClass,
  sessionBodyClass,
  sessionFrameClass,
  sessionHeaderClass,
  sessionImagePanelClass,
  sessionLogPanelClass
} from './sessionStyles'

const SET_ROWS = 3

const ValueSkeleton = () => (
  <div className="flex flex-col items-center gap-2">
    <div className={clsx(skeletonClass, 'h-9 w-14')} />
    <div className={clsx(skeletonClass, 'h-3 w-6')} />
  </div>
)

const StepperSkeleton = () => (
  <div className="flex flex-1 gap-2">
    <div className={clsx(skeletonClass, 'h-12 flex-1 rounded-full')} />
    <div className={clsx(skeletonClass, 'h-12 flex-1 rounded-full')} />
  </div>
)

const MobileSessionSkeleton = () => (
  <div
    aria-busy="true"
    aria-label="Loading workout"
    className={sessionFrameClass}
  >
    <header className={sessionHeaderClass}>
      <Link
        to="/training"
        aria-label="Back to training"
        className={sessionBackLinkClass}
      >
        <ArrowLeft aria-hidden className="size-5" />
      </Link>
      <div className={clsx(skeletonClass, 'mx-auto h-5 w-32 max-w-full')} />
      <div className="flex flex-col items-end gap-1">
        <div className={clsx(skeletonClass, 'h-3 w-8')} />
        <div className={clsx(skeletonClass, 'h-3.5 w-20 max-w-full')} />
      </div>
    </header>

    <div className={sessionBodyClass}>
      <div className={sessionImagePanelClass}>
        <div className={clsx(skeletonClass, 'size-14 rounded-lg')} />
      </div>
      <div className="mt-3 flex h-[1.42rem] shrink-0 items-center">
        <div className={clsx(skeletonClass, 'h-3.5 w-3/4')} />
      </div>
      <ol className="mt-4 flex min-h-0 grow flex-col gap-2 overflow-hidden p-px">
        {Array.from({ length: SET_ROWS }, (_, index) => (
          <li
            key={index}
            className="flex min-h-12 shrink-0 items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3"
          >
            <div className={clsx(skeletonClass, 'size-7 rounded-full')} />
            <div className={clsx(skeletonClass, 'h-3.5 w-20')} />
          </li>
        ))}
      </ol>
      <div className="flex shrink-0 justify-end pt-3">
        <div className="size-11 rounded-md border border-neutral-700" />
      </div>
      <div className="mt-2 h-11 shrink-0 rounded-md border border-neutral-800 bg-neutral-900/70" />
    </div>

    <div className={sessionLogPanelClass}>
      <div className="flex h-[1.094rem] items-center">
        <div className={clsx(skeletonClass, 'h-3.5 w-44')} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className={clsx(skeletonClass, 'h-9 w-[5.75rem] rounded-md')} />
        <div className={clsx(skeletonClass, 'h-9 w-[6.5rem] rounded-md')} />
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-center gap-3">
        <ValueSkeleton />
        <div className={clsx(skeletonClass, 'size-[4.5rem] rounded-full')} />
        <ValueSkeleton />
      </div>
      <div className="mt-3 flex gap-6">
        <StepperSkeleton />
        <StepperSkeleton />
      </div>
    </div>
  </div>
)

const DesktopSessionSkeleton = () => (
  <div aria-busy="true" aria-label="Loading workout">
    <div className={clsx(skeletonClass, 'h-4 w-16')} />
    <div className={clsx(skeletonClass, 'mt-5 h-9 w-44')} />
    <div className={clsx(skeletonClass, 'mt-3 h-4 w-32')} />
    <div className={clsx(panelClass, 'mt-8')}>
      <div className="border-b border-neutral-800 px-4 py-4 sm:px-6">
        <div className={clsx(skeletonClass, 'h-5 w-24')} />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-t border-neutral-800 px-4 py-4 first:border-t-0 sm:px-6"
        >
          <div className={clsx(skeletonClass, 'size-7 rounded-full')} />
          <div className="flex-1">
            <div className={clsx(skeletonClass, 'h-4 w-1/2')} />
            <div className={clsx(skeletonClass, 'mt-2 h-3 w-16')} />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const SessionSkeleton = () => {
  const isMobile = useIsMobile()
  useHideSiteNav(isMobile)
  return isMobile ? <MobileSessionSkeleton /> : <DesktopSessionSkeleton />
}
