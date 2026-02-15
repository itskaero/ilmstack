'use client'

import { useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'
import { updateWorkspaceAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function GeneralSettingsPage() {
  const params = useParams()
  const slug = params.workspace as string
  const { workspace, role } = useWorkspace()
  const isAdmin = role === 'admin'

  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description ?? '')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const fd = new FormData()
    fd.set('name', name)
    fd.set('description', description)

    startTransition(async () => {
      const result = await updateWorkspaceAction(workspace.id, slug, fd)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Settings saved successfully.' })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">
          Basic workspace information
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin || isPending}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL</Label>
            <Input
              id="slug"
              value={workspace.slug}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Workspace URL cannot be changed after creation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isAdmin || isPending}
              rows={3}
              maxLength={500}
              placeholder="A brief description of this workspace..."
            />
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      <Card className="p-6">
        <div className="space-y-1">
          <h3 className="font-medium">Workspace ID</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {workspace.id}
          </p>
        </div>
      </Card>
    </div>
  )
}
