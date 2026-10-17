import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Label } from '@radix-ui/react-label'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/hooks/use-toast'
import { useAsyncDispatch } from '@/store/store'
import { userLogin } from '@/features/auth/authSlice'
import { useChangePasswordMutation } from '@/services/protectedRoutesAPI'
import {
  confirmPasswordError,
  existingPasswordError,
  newPasswordError
} from '@/constants/authRules'
import { authErrorMessage } from './authErrors'

const FieldError = ({ errors }: { errors: unknown[] }) =>
  errors.length > 0 ? (
    <p className="text-red-500 text-sm">{errors.join(', ')}</p>
  ) : null

export function ChangePassword() {
  const dispatch = useAsyncDispatch()
  const navigate = useNavigate()
  const [changePassword, { isLoading }] = useChangePasswordMutation()
  const [responseError, setResponseError] = useState('')

  const form = useForm({
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setResponseError('')
      try {
        const response = await changePassword({
          old_password: value.oldPassword,
          new_password: value.newPassword,
          confirm_password: value.confirmPassword
        }).unwrap()

        // Other devices were signed out; this one keeps going on the new session
        await dispatch(
          userLogin({
            email: response.email,
            username: response.username,
            refresh_token: response.refresh_token_data,
            token_data: response.token_data
          })
        )
        toast({
          variant: 'success',
          title: 'Password changed',
          description: 'Other devices have been signed out.'
        })
        navigate({ to: '/profile' })
      } catch (error) {
        setResponseError(
          authErrorMessage(error, 'Couldn’t change your password. Try again.')
        )
      }
    }
  })

  return (
    <Card className="w-full max-w-[420px]">
      <CardHeader>
        <CardTitle className="text-[2.5rem] leading-tight">
          Change password
        </CardTitle>
        <CardDescription className="pb-5">
          Enter your current password, then choose a new one.
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
              name="oldPassword"
              validators={{
                onChange: ({ value }) => existingPasswordError(value)
              }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Current password</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    type="password"
                    autoComplete="current-password"
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>
            <form.Field
              name="newPassword"
              validators={{ onChange: ({ value }) => newPasswordError(value) }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>New password</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    type="password"
                    autoComplete="new-password"
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>
            <form.Field
              name="confirmPassword"
              validators={{
                onChangeListenTo: ['newPassword'],
                onChange: ({ value, fieldApi }) =>
                  confirmPasswordError(
                    value,
                    fieldApi.form.getFieldValue('newPassword')
                  )
              }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Confirm new password</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    type="password"
                    autoComplete="new-password"
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>
          </div>
          <Button type="submit" className="w-full mt-5" disabled={isLoading}>
            {isLoading && <Spinner />} Change password
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col">
        <Link to="/profile" className="w-full">
          <Button variant="secondary" className="w-full">
            Back to profile
          </Button>
        </Link>
        {responseError.length > 0 && (
          <p role="alert" className="text-red-500 text-[0.9rem] pt-5">
            {`Error: ${responseError}`}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
