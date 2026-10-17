import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useAsyncDispatch } from '@/store/store'
import { userLogin } from '@/features/auth/authSlice'
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
import { UserCredentials } from '@/types/auth'
import { loginUser } from '@/services/authAPI'
import { authErrorMessage } from '@/components/auth/authErrors'

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
    <div className="flex flex-col w-full max-w-[1920px] h-dvh justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-[2.5rem]">Login</CardTitle>
          <CardDescription className="pb-5">
            Enter your email and password below to login to your account
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
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.name}>Password</Label>
                      <Link
                        to="/forgotPassword"
                        className="text-sm text-white/60 hover:text-white hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      type="password"
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
            <Button type="submit" className="w-full mt-5" disabled={isLoading}>
              {isLoading && <Spinner />} Login
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Label className="text-white/60 text-sm pb-3">
            {"Don't have an account?"}
          </Label>

          <Link to="/registerUser" className="w-full">
            <Button variant="secondary" className="w-full">
              Signup
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
