'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { magicLinkAction } from '@/app/(auth)/actions'
import { magicLinkSchema, type MagicLinkInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function MagicLinkPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [isPending, startTransition] = useTransition()

  const form = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  })

  function onSubmit(values: MagicLinkInput) {
    setServerError(null)
    const formData = new FormData()
    formData.set('email', values.email)

    startTransition(async () => {
      const result = await magicLinkAction(formData)
      if ('error' in result) {
        setServerError(result.error)
      } else {
        setSentTo(values.email)
        setSent(true)
      }
    })
  }

  // Success state
  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            We sent a magic link to{' '}
            <span className="font-medium text-foreground">{sentTo}</span>
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Click the link in the email to sign in. The link expires in 1 hour.
          Check your spam folder if you don&apos;t see it.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => { setSent(false); form.reset() }}
        >
          Use a different email
        </Button>
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Magic link</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we&apos;ll send you a sign-in link — no password needed.
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      type="email"
                      placeholder="dr.name@hospital.com"
                      className="pl-9"
                      autoComplete="email"
                      disabled={isPending}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send magic link
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="text-primary hover:underline underline-offset-4"
        >
          Back to sign in with password
        </Link>
      </p>
    </div>
  )
}
