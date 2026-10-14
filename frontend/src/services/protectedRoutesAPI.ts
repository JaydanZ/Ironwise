import {
  createApi,
  fetchBaseQuery,
  FetchArgs,
  BaseQueryApi
} from '@reduxjs/toolkit/query/react'
import { RootState } from '@/store/store'
import { refreshAccessToken } from '@/features/auth/authSlice'
import { genNewAccessToken } from './authAPI'
import { Profile } from '@/types/profile'
import {
  ProgramPage,
  ProgramPageArgs,
  WorkoutProgram
} from '@/types/programCreation'
import { AuthorizedResponse, ChangePasswordRequest } from '@/types/auth'
import {
  PreviousPerformance,
  SubmitWorkoutResponse,
  WorkoutHistoryResponse,
  WorkoutSubmission
} from '@/types/workoutSession'
import { API_BASE_URL } from './apiConfig'

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: async (headers, { getState }) => {
    const token = (getState() as RootState).auth.userToken
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  }
})

const protectedRoutesApi = async (
  args: string | FetchArgs,
  api: BaseQueryApi,
  extraOptions: object
) => {
  let result = await baseQuery(args, api, extraOptions)

  // If status was 401, we need to generate a new access token
  if (result.error && result.error.status === 401) {
    const refreshedToken = await genNewAccessToken()
    if (refreshedToken) {
      // store the newly refreshed token
      await api.dispatch(refreshAccessToken(refreshedToken.access_token))

      // retry the original query
      result = await baseQuery(args, api, extraOptions)
    }
  }
  return result
}

export const protectedApiSlice = createApi({
  baseQuery: protectedRoutesApi,
  tagTypes: [
    'Profile',
    'Programs',
    'Program',
    'PreviousPerformance',
    'WorkoutHistory'
  ],
  endpoints: (builder) => ({
    getProfileData: builder.query<Profile, void>({
      query: () => '/users/me',
      keepUnusedDataFor: 5,
      providesTags: ['Profile']
    }),
    getPrograms: builder.query<ProgramPage, ProgramPageArgs>({
      query: ({ page, limit, q }) =>
        `/programs?${new URLSearchParams({
          page: String(page),
          limit: String(limit),
          q
        })}`,
      // Visited pages and searches stay cached so going back is instant
      keepUnusedDataFor: 120,
      providesTags: ['Programs']
    }),
    getProgram: builder.query<WorkoutProgram, string>({
      query: (programId) => `/programs/${encodeURIComponent(programId)}`,
      providesTags: (_result, _error, programId) => [
        { type: 'Program', id: programId }
      ]
    }),
    getPreviousPerformance: builder.query<
      PreviousPerformance,
      { names: string[]; until: string }
    >({
      query: ({ names, until }) => {
        const params = new URLSearchParams({ until })
        names.forEach((name) => params.append('names', name))
        return `/workouts/previous-performance?${params.toString()}`
      },
      providesTags: ['PreviousPerformance']
    }),
    getWorkoutHistory: builder.query<WorkoutHistoryResponse, { limit: number }>(
      {
        query: ({ limit }) =>
          `/workouts?${new URLSearchParams({ limit: String(limit) })}`,
        providesTags: ['WorkoutHistory']
      }
    ),
    submitWorkout: builder.mutation<SubmitWorkoutResponse, WorkoutSubmission>({
      query: (body) => ({ url: '/workouts', method: 'POST', body }),
      invalidatesTags: ['Profile', 'PreviousPerformance', 'WorkoutHistory']
    }),
    changePassword: builder.mutation<AuthorizedResponse, ChangePasswordRequest>(
      {
        query: (body) => ({ url: '/users/me/password', method: 'PUT', body })
      }
    )
  })
})

// Export generated hooks
export const {
  useGetProfileDataQuery,
  useGetProgramsQuery,
  useGetProgramQuery,
  usePrefetch,
  useGetPreviousPerformanceQuery,
  useGetWorkoutHistoryQuery,
  useSubmitWorkoutMutation,
  useChangePasswordMutation
} = protectedApiSlice
