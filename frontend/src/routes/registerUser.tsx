import { useState } from 'react'
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { LockKeyhole, Mail, User } from 'lucide-react'
import { signupUser } from '@/services/authAPI'
import { SignupUser } from '@/types/auth'
import { confirmPasswordError, newPasswordError } from '@/constants/authRules'
import { authErrorMessage } from '@/components/auth/authErrors'
import { AuthLayout, AuthSubmitButton } from '@/components/auth/AuthLayout'
import { AuthField } from '@/components/auth/AuthField'

const MIN_USERNAME_LENGTH = 4

export const Route = createFileRoute('/registerUser')({
  component: RouteComponent,
  beforeLoad: async () => {
    const tokenInStore = await cookieStore.get('auth_token')
    const userToken = tokenInStore ? tokenInStore?.value : null
    const isLoggedIn = userToken ? true : false
    if (isLoggedIn) {
      throw redirect({
        to: '/home'
      })
    }
  }
})

function RouteComponent() {
  const navigate = useNavigate()
  const [responseError, setResponseError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    onSubmit: async ({ value }) => {
      setResponseError('')
      setIsLoading(true)

      const userData: SignupUser = {
        username: value.username,
        email: value.email,
        password: value.password
      }

      try {
        await signupUser(userData)
        // successfully registered user, navigate to login page
        setIsLoading(false)
        navigate({ to: '/login' })
      } catch (error) {
        setResponseError(
          authErrorMessage(error, 'Couldn’t create your account. Try again.')
        )
        setIsLoading(false)
      }
    }
  })

  return (
    <AuthLayout
      title="Create your account"
      description="Save your programs and see which lifts are getting stronger."
      pageLabel="Sign up"
      backTo="/login"
      switchPrompt="Already have an account?"
      switchLabel="Log in"
      switchTo="/login"
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
            name="username"
            validators={{
              onChange: ({ value }) => {
                const formattedUsername = value.trim()
                if (formattedUsername.length === 0)
                  return 'Username is required'
                if (formattedUsername.length < MIN_USERNAME_LENGTH)
                  return `Username must be at least ${MIN_USERNAME_LENGTH} characters`
                return undefined
              }
            }}
          >
            {(field) => (
              <AuthField
                id={field.name}
                label="Username"
                type="text"
                icon={<User />}
                placeholder="Username"
                autoComplete="username"
                value={field.state.value}
                onChange={field.handleChange}
                errors={field.state.meta.errors}
              />
            )}
          </form.Field>
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
          <div className="grid gap-3">
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => newPasswordError(value)
              }}
            >
              {(field) => (
                <AuthField
                  id={field.name}
                  label="Password"
                  type="password"
                  icon={<LockKeyhole />}
                  placeholder="Password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={field.handleChange}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
            <form.Field
              name="confirmPassword"
              validators={{
                onChangeListenTo: ['password'],
                onChange: ({ value, fieldApi }) =>
                  confirmPasswordError(
                    value,
                    fieldApi.form.getFieldValue('password')
                  )
              }}
            >
              {(field) => (
                <AuthField
                  id={field.name}
                  label="Confirm Password"
                  type="password"
                  icon={<LockKeyhole />}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={field.handleChange}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
          </div>
        </div>
        <AuthSubmitButton isLoading={isLoading}>Signup</AuthSubmitButton>
      </form>
    </AuthLayout>
  )
}
