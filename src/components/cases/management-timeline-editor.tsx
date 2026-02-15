'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { ManagementTimelineEntry } from '@/types/database'

interface ManagementTimelineEditorProps {
  entries: ManagementTimelineEntry[]
  onChange: (entries: ManagementTimelineEntry[]) => void
  readOnly?: boolean
}

export function ManagementTimelineEditor({
  entries,
  onChange,
  readOnly = false,
}: ManagementTimelineEditorProps) {
  const addEntry = () => {
    onChange([
      ...entries,
      { date: new Date().toISOString().split('T')[0], action: '', notes: null },
    ])
  }

  const updateEntry = (
    index: number,
    field: keyof ManagementTimelineEntry,
    value: string | null
  ) => {
    const updated = entries.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    onChange(updated)
  }

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index))
  }

  if (readOnly) {
    return (
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No timeline entries.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {entries.map((entry, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/30 shrink-0 z-10 flex items-center justify-center mt-0.5">
                    <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="text-xs font-medium text-muted-foreground mb-0.5">
                      {entry.date}
                    </div>
                    <p className="text-sm font-medium">{entry.action}</p>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div
          key={index}
          className="rounded-lg border border-border p-3 space-y-2 bg-muted/20"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">
              Entry {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeEntry(index)}
              className="ml-auto text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={entry.date}
                onChange={(e) => updateEntry(index, 'date', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Input
                value={entry.action}
                onChange={(e) => updateEntry(index, 'action', e.target.value)}
                placeholder="e.g. Started antibiotics"
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={entry.notes ?? ''}
              onChange={(e) => updateEntry(index, 'notes', e.target.value || null)}
              placeholder="Additional details…"
              className="min-h-[56px] text-xs resize-none"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-7"
        onClick={addEntry}
      >
        <Plus className="h-3.5 w-3.5" />
        Add timeline entry
      </Button>
    </div>
  )
}
