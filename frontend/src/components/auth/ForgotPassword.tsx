import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { isAxiosError } from 'axios'
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
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyResetCode
} from '@/services/authAPI'
import {
  confirmPasswordError,
  newPasswordError,
  RESET_CODE_LENGTH
} from '@/constants/authRules'
import { authErrorMessage } from './authErrors'

type Step = 'email' | 'code' | 'password'

const EMAIL_REGEX = /^[^@]+@[^@]+\.[^@]+$/

const FieldError = ({ errors }: { errors: unknown[] }) =>
  errors.length > 0 ? (
    <p className="text-red-500 text-sm">{errors.join(', ')}</p>
  ) : null

export function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [responseError, setResponseError] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const run = async (action: () => Promise<void>, fallback: string) => {
    setResponseError('')
    setNotice('')
    setIsLoading(true)
    try {
      await action()
    } catch (error) {
      setResponseError(authErrorMessage(error, fallback))
    } finally {
      setIsLoading(false)
    }
  }

  const emailForm = useForm({
    defaultValues: { email: '' },
    onSubmit: ({ value }) =>
      run(async () => {
        const trimmed = value.email.trim()
        await requestPasswordReset(trimmed)
        setEmail(trimmed)
        setStep('code')
      }, 'Couldn’t send a code. Try again.')
  })

  const codeForm = useForm({
    defaultValues: { code: '' },
    onSubmit: ({ value }) =>
      run(async () => {
        const { reset_token } = await verifyResetCode(email, value.code)
        setResetToken(reset_token)
        setStep('password')
      }, 'That code is invalid or expired.')
  })

  const passwordForm = useForm({
    defaultValues: { newPassword: '', confirmPassword: '' },
    onSubmit: ({ value }) =>
      run(async () => {
        try {
          await confirmPasswordReset(
            resetToken,
            value.newPassword,
            value.confirmPassword
          )
        } catch (error) {
          // A rejected reset token is used up or expired; start over for a new one
          if (isAxiosError(error) && error.response?.status === 400) {
            setStep('email')
            codeForm.reset()
          }
          throw error
        }
        toast({
          variant: 'success',
          title: 'Password reset',
          description: 'Log in with your new password.'
        })
        navigate({ to: '/login' })
      }, 'Your reset session expired. Request a new code.')
  })

  const resendCode = () =>
    run(async () => {
      await requestPasswordReset(email)
      codeForm.reset()
      setNotice('If an account exists for that email, we’ve sent a new code.')
    }, 'Couldn’t send a code. Try again.')

  const useDifferentEmail = () => {
    setResponseError('')
    setNotice('')
    codeForm.reset()
    setStep('email')
  }

  const description = {
    email: 'Enter your account email and we’ll send you a 6-digit code.',
    code: `If an account exists for ${email}, we’ve sent a code. It expires in 15 minutes.`,
    password: 'Choose a new password for your account.'
  }[step]

  return (
    <Card className="w-full max-w-[420px]">
      <CardHeader>
        <CardTitle className="text-[2.5rem] leading-tight">
          Reset password
        </CardTitle>
        <CardDescription className="pb-5">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        {step === 'email' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              emailForm.handleSubmit()
            }}
          >
            <emailForm.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  const trimmed = value.trim()
                  if (trimmed.length === 0) return 'Email is required'
                  if (!EMAIL_REGEX.test(trimmed)) return 'Email is invalid'
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
                    autoComplete="email"
                    placeholder="user@example.com"
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </emailForm.Field>
            <Button type="submit" className="w-full mt-5" disabled={isLoading}>
              {isLoading && <Spinner />} Send code
            </Button>
          </form>
        )}

        {step === 'code' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              codeForm.handleSubmit()
            }}
          >
            <codeForm.Field
              name="code"
              validators={{
                onChange: ({ value }) =>
                  value.length === RESET_CODE_LENGTH
                    ? undefined
                    : `Enter the ${RESET_CODE_LENGTH}-digit code`
              }}
            >
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Verification code</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={RESET_CODE_LENGTH}
                    className="tracking-[0.4em] tabular-nums"
                    onChange={(e) =>
                      field.handleChange(e.target.value.replace(/\D/g, ''))
                    }
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </codeForm.Field>
            <Button type="submit" className="w-full mt-5" disabled={isLoading}>
              {isLoading && <Spinner />} Verify code
            </Button>
            <div className="flex justify-between pt-3 text-sm">
              <button
                type="button"
                onClick={resendCode}
                disabled={isLoading}
                className="text-[#46ea43] hover:underline disabled:opacity-50"
              >
                Send a new code
              </button>
              <button
                type="button"
                onClick={useDifferentEmail}
                className="text-white/60 hover:text-white hover:underline"
              >
                Use a different email
              </button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              passwordForm.handleSubmit()
            }}
          >
            <div className="flex flex-col gap-6">
              <passwordForm.Field
                name="newPassword"
                validators={{
                  onChange: ({ value }) => newPasswordError(value)
                }}
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
              </passwordForm.Field>
              <passwordForm.Field
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
              </passwordForm.Field>
            </div>
            <Button type="submit" className="w-full mt-5" disabled={isLoading}>
              {isLoading && <Spinner />} Reset password
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col">
        <Label className="text-white/60 text-sm pb-3">Remembered it?</Label>
        <Link to="/login" className="w-full">
          <Button variant="secondary" className="w-full">
            Back to login
          </Button>
        </Link>
        {notice.length > 0 && (
          <p role="status" className="text-white/80 text-[0.9rem] pt-5">
            {notice}
          </p>
        )}
        {responseError.length > 0 && (
          <p role="alert" className="text-red-500 text-[0.9rem] pt-5">
            {`Error: ${responseError}`}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
