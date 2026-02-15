'use client'

import { useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'
import { updateWorkspaceAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

const PRESET_COLORS = [
  '#1a73e8', // Blue
  '#0d9488', // Teal
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#ea580c', // Orange
  '#16a34a', // Green
  '#dc2626', // Red
  '#4f46e5', // Indigo
]

export default function BrandingSettingsPage() {
  const params = useParams()
  const slug = params.workspace as string
  const { workspace, role } = useWorkspace()
  const isAdmin = role === 'admin'

  const [primaryColor, setPrimaryColor] = useState(
    workspace.primary_color ?? '#1a73e8'
  )
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const fd = new FormData()
    fd.set('name', workspace.name) // required by schema
    fd.set('primary_color', primaryColor)

    startTransition(async () => {
      const result = await updateWorkspaceAction(workspace.id, slug, fd)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Branding updated successfully.' })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of your workspace
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Primary color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPrimaryColor(color)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor:
                      primaryColor === color ? color : 'transparent',
                    boxShadow:
                      primaryColor === color
                        ? `0 0 0 2px white, 0 0 0 4px ${color}`
                        : 'none',
                  }}
                  disabled={!isAdmin}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1a73e8"
                className="w-32 font-mono text-sm"
                pattern="^#[0-9a-fA-F]{6}$"
                disabled={!isAdmin || isPending}
              />
              <div
                className="w-8 h-8 rounded-md border border-border"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Preview</Label>
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {workspace.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-semibold">{workspace.name}</span>
              </div>
              <div className="flex gap-2">
                <div
                  className="px-3 py-1.5 rounded-md text-white text-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  Primary Button
                </div>
                <div
                  className="px-3 py-1.5 rounded-md text-sm border"
                  style={{ color: primaryColor, borderColor: primaryColor }}
                >
                  Outline Button
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save branding
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  )
}
