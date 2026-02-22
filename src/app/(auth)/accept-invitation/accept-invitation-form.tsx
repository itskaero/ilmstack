'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Building2 } from 'lucide-react'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { acceptInvitationAction } from '@/app/(auth)/actions'
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
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/config/app'
import type { WorkspaceRole } from '@/types'

interface Props {
  token: string
  invitation: {
    email: string
    role: WorkspaceRole
  }
  workspace: {
    name: string
    logo_url: string | null
  }
  isLoggedIn: boolean
  currentUserEmail: string | null
}

export function AcceptInvitationForm({
  token,
  invitation,
  workspace,
  isLoggedIn,
  currentUserEmail,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: invitation.email,
      password: '',
      confirm_password: '',
    },
  })

  function onSubmit(values: RegisterInput) {
    setServerError(null)
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => formData.set(key, value))

    startTransition(async () => {
      const result = await acceptInvitationAction(token, formData)
      if (result && 'error' in result) {
        setServerError(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Workspace card */}
      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
        {workspace.logo_url ? (
          <Image
            src={workspace.logo_url}
            alt={workspace.name}
            width={40}
            height={40}
            className="rounded-md"
          />
        ) : (
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{workspace.name}</p>
          <p className="text-xs text-muted-foreground">
            You&apos;re invited as{' '}
            <Badge variant="outline" className="ml-0.5 text-xs">
              {ROLE_LABELS[invitation.role]}
            </Badge>
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Accept invitation</h1>
        <p className="text-muted-foreground text-sm">
          Invitation sent to{' '}
          <span className="font-medium text-foreground">{invitation.email}</span>
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {isLoggedIn ? (
        /* Already logged in */
        currentUserEmail?.toLowerCase() !== invitation.email.toLowerCase() ? (
          /* Wrong account — warn and block */
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                This invitation was sent to <strong>{invitation.email}</strong>, but
                you&apos;re signed in as <strong>{currentUserEmail}</strong>.
                Please sign out and open the link again, or ask the admin to resend
                the invitation to your current account.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          /* Correct account — let them join */
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                You&apos;re signed in as <strong>{currentUserEmail}</strong>.
                Click below to join the workspace.
              </AlertDescription>
            </Alert>
            <Button
              className="w-full"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const formData = new FormData()
                  formData.set('email', currentUserEmail ?? '')
                  const result = await acceptInvitationAction(token, formData)
                  if (result && 'error' in result) setServerError(result.error)
                })
              }}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Join {workspace.name}
            </Button>
          </div>
        )
      ) : (
        /* New user registration */
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Dr. Jane Smith" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Create password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account &amp; join workspace
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}
