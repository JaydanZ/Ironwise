import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { LockKeyhole, Mail } from 'lucide-react'
import { useAsyncDispatch } from '@/store/store'
import { userLogin } from '@/features/auth/authSlice'
import { UserCredentials } from '@/types/auth'
import { loginUser } from '@/services/authAPI'
import { authErrorMessage } from '@/components/auth/authErrors'
import { AuthLayout, AuthSubmitButton } from '@/components/auth/AuthLayout'
import { AuthField } from '@/components/auth/AuthField'

export const Route = createFileRoute('/login')({
  component: RouteComponent
})

function RouteComponent() {
  const dispatch = useAsyncDispatch()
  const navigate = useNavigate()
  const [responseError, setResponseError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    defaultValues: {
      email: '',
      password: ''
    },

    onSubmit: async ({ value }) => {
      setResponseError('')
      setIsLoading(true)

      const userData: UserCredentials = {
        email: value.email,
        password: value.password
      }

      try {
        const response = await loginUser(userData)

        const dataResponse = {
          email: response.data.email,
          username: response.data.username,
          refresh_token: response.data.refresh_token_data,
          token_data: {
            access_token: response.data.token_data.access_token,
            token_type: response.data.token_data.token_type
          }
        }

        // Store bearer token in local storage
        await dispatch(userLogin(dataResponse))

        setIsLoading(false)
        navigate({ to: '/home' })
      } catch (error: unknown) {
        setResponseError(authErrorMessage(error, 'Couldn’t log in. Try again.'))
        setIsLoading(false)
      }
    }
  })
  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to pick up your program where you left off."
      pageLabel="Log in"
      backTo="/"
      switchPrompt="Don't have an account?"
      switchLabel="Sign up"
      switchTo="/registerUser"
      error={responseError}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div className="flex flex-col gap-3">
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                const formattedEmail = value.trim()
                const emailRegex = /^[^@]+@[^@]+\.[^@]+$/
                if (formattedEmail.length === 0) return 'Email is required'
                if (!emailRegex.test(formattedEmail)) return 'Email is invalid'
                return undefined
              }
            }}
          >
            {(field) => (
              <AuthField
                id={field.name}
                label="Email"
                type="email"
                icon={<Mail />}
                placeholder="Email address"
                autoComplete="email"
                value={field.state.value}
                onChange={field.handleChange}
                errors={field.state.meta.errors}
              />
            )}
          </form.Field>
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const formattedPassword = value.trim()
                if (formattedPassword.length === 0)
                  return 'Password is required'
                return undefined
              }
            }}
          >
            {(field) => (
              <AuthField
                id={field.name}
                label="Password"
                type="password"
                icon={<LockKeyhole />}
                placeholder="Password"
                autoComplete="current-password"
                value={field.state.value}
                onChange={field.handleChange}
                errors={field.state.meta.errors}
                labelAside={
                  <Link
                    to="/forgotPassword"
                    className="-my-1 px-2 py-1 text-sm text-app-colors-300 hover:underline"
                  >
                    Forgot password?
                  </Link>
                }
              />
            )}
          </form.Field>
        </div>
        <AuthSubmitButton isLoading={isLoading}>Login</AuthSubmitButton>
      </form>
    </AuthLayout>
  )
}
