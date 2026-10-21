import { useEffect } from 'react'
import { ProgramFactory } from './ProgramFactory'
import { ProgramResult } from './ProgramResult'
import { ProgramLoadingScreen } from './ProgramLoadingScreen'
import {
  isProgramJobError,
  ProgramGenerationError,
  resumeAIProgram
} from '@/features/programGeneration/programGenerationSlice'
import { useSelector } from 'react-redux'
import { RootState, useAsyncDispatch } from '@/store/store'
import { LimitReachedDisplay } from './LimitReachedDisplay'
import { getExpireTime } from '@/services/programGenAPI'
import { toast } from '@/hooks/use-toast'
import clsx from 'clsx'

export const ProgramFactoryPage = () => {
  const dispatch = useAsyncDispatch()
  const programResult = useSelector(
    (state: RootState) => state.programGeneration.aiProgram
  )
  const isLoading = useSelector(
    (state: RootState) => state.programGeneration.loading
  )
  const resumeStatus = useSelector(
    (state: RootState) => state.programGeneration.resumeStatus
  )

  const programGenerationError = useSelector(
    (state: RootState) => state.programGeneration.error
  )

  useEffect(() => {
    dispatch(resumeAIProgram()).then((result) => {
      if (
        resumeAIProgram.rejected.match(result) &&
        isProgramJobError(result.payload)
      ) {
        toast({
          variant: 'error',
          title: 'We couldn’t finish your program',
          description: 'Try again.'
        })
      }
    })
  }, [dispatch])

  // Handle program generation limit
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn)

  const limitProgramGen = !isLoggedIn && getExpireTime() ? true : false

  const rateLimitReached =
    programGenerationError &&
    (programGenerationError as ProgramGenerationError).errorCode === 429
      ? true
      : false

  // Until the resume check answers, the form would flash before a stored program appears
  const resumeChecked = resumeStatus === 'done'

  const displayProgramFactory =
    resumeChecked &&
    !programResult &&
    !isLoading &&
    !limitProgramGen &&
    !rateLimitReached
      ? true
      : false

  const displayRateLimit =
    resumeChecked &&
    !programResult &&
    !isLoading &&
    (limitProgramGen || rateLimitReached)

  return (
    <div
      className={clsx(
        'flex justify-center px-4 pt-8 pb-32 min-[800px]:px-0 min-[800px]:pt-[90px] min-[800px]:pb-0',
        programResult && !isLoading
          ? 'items-start h-max'
          : 'items-center min-h-dvh'
      )}
    >
      {displayProgramFactory && <ProgramFactory />}
      {displayRateLimit && (
        <LimitReachedDisplay authLimitReached={isLoggedIn} />
      )}
      {isLoading && <ProgramLoadingScreen />}
      {programResult && !isLoading && <ProgramResult />}
    </div>
  )
}
