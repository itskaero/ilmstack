'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Building2 } from 'lucide-react'
import { createWorkspaceAction } from './actions'
import { createWorkspaceSchema, type CreateWorkspaceInput } from '@/lib/validations/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { slugify } from '@/lib/utils'

interface Props {
  userId: string
}

export function NewWorkspaceForm({ userId }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '', slug: '', description: '' },
  })

  // Auto-generate slug from name
  const name = form.watch('name')
  useEffect(() => {
    const current = form.getValues('slug')
    const auto = slugify(name)
    // Only auto-update if user hasn't manually edited the slug
    if (!current || current === slugify(form.getValues('name').slice(0, -1))) {
      form.setValue('slug', auto, { shouldValidate: false })
    }
  }, [name, form])

  function onSubmit(values: CreateWorkspaceInput) {
    setServerError(null)
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (value) formData.set(key, value)
    })
    formData.set('userId', userId)

    startTransition(async () => {
      const result = await createWorkspaceAction(formData)
      if (result.error) {
        setServerError(result.error)
      } else if (result.slug) {
        router.push(`/${result.slug}`)
      }
    })
  }

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workspace name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      placeholder="City General Hospital — Cardiology"
                      className="pl-9"
                      disabled={isPending}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Your hospital or department name (visible to all members)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workspace URL</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-0">
                    <span className="flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                      ilmstack.health/
                    </span>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(slugify(e.target.value))
                      }}
                      placeholder="city-general-cardiology"
                      className="rounded-l-none"
                      disabled={isPending}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Lowercase letters, numbers, and hyphens only
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Description{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Cardiology department knowledge base for clinical notes, cases, and monthly journals."
                    rows={3}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create workspace
          </Button>
        </form>
      </Form>
    </div>
  )
}
