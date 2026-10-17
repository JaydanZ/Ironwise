import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
  redirect
} from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@radix-ui/react-label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { signupUser } from '@/services/authAPI'
import { SignupUser } from '@/types/auth'
import { confirmPasswordError, newPasswordError } from '@/constants/authRules'
import { authErrorMessage } from '@/components/auth/authErrors'

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
    <div className="flex flex-col w-full max-w-[1920px] h-dvh justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-[2.5rem]">Signup</CardTitle>
          <CardDescription className="pb-5">
            Create an account to unlock the full features of Ironwise
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <div className="flex flex-col gap-6">
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
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Username</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      type="text"
                      placeholder="user"
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-red-500 text-sm">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const formattedEmail = value.trim()
                    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/
                    if (formattedEmail.length === 0) return 'Email is required'
                    if (!emailRegex.test(formattedEmail))
                      return 'Email is invalid'
                    return undefined
                  }
                }}
              >
                {(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      type="email"
                      placeholder="user@example.com"
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-red-500 text-sm">
                        {field.state.meta.errors.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
              <div className="grid gap-2 py-5">
                <form.Field
                  name="password"
                  validators={{
                    onChange: ({ value }) => newPasswordError(value)
                  }}
                >
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor={field.name}>Password</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        type="password"
                        autoComplete="new-password"
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-red-500 text-sm">
                          {field.state.meta.errors.join(', ')}
                        </p>
                      )}
                    </div>
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
                    <div className="grid gap-2">
                      <Label htmlFor={field.name}>Confirm Password</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        type="password"
                        autoComplete="new-password"
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-red-500 text-sm">
                          {field.state.meta.errors.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>
            </div>
            <Button type="submit" className="w-full mt-5" disabled={isLoading}>
              {isLoading && <Spinner />} Signup
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Label className="text-white/60 text-sm pb-3">
            Already have an account?
          </Label>
          <Link to="/login" className="w-full">
            <Button variant="secondary" className="w-full">
              Login
            </Button>
          </Link>
          {responseError.length > 0 && (
            <p className="text-red-500 text-[0.9rem] pt-5">{`Error: ${responseError}`}</p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
