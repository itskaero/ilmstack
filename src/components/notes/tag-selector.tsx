'use client'

import { useState } from 'react'
import { Check, Tag, X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Tag as TagType } from '@/types/database'

// We need Popover — add it to our UI components
// For now using a simple dropdown approach

interface TagSelectorProps {
  tags: TagType[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onCreateTag?: (name: string) => Promise<TagType | null>
  className?: string
}

export function TagSelector({
  tags,
  selectedIds,
  onChange,
  onCreateTag,
  className,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const selectedTags = tags.filter((t) => selectedIds.includes(t.id))
  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )
  const exactMatch = tags.some(
    (t) => t.name.toLowerCase() === search.toLowerCase()
  )

  const toggleTag = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const handleCreate = async () => {
    if (!onCreateTag || !search.trim()) return
    setCreating(true)
    const newTag = await onCreateTag(search.trim())
    if (newTag) {
      onChange([...selectedIds, newTag.id])
      setSearch('')
    }
    setCreating(false)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs gap-1 pr-1"
              style={{ borderColor: tag.color + '60', color: tag.color }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="ml-0.5 hover:opacity-70"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs w-fit gap-1.5"
          >
            <Tag className="h-3 w-3" />
            {selectedIds.length > 0 ? 'Edit tags' : 'Add tags'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <Input
            placeholder="Search or create tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs mb-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (!exactMatch && search && onCreateTag) handleCreate()
              }
            }}
          />
          <div className="max-h-40 overflow-y-auto">
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 truncate">{tag.name}</span>
                {selectedIds.includes(tag.id) && (
                  <Check className="h-3 w-3 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
          {search && !exactMatch && onCreateTag && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs rounded hover:bg-muted mt-1 border-t border-border pt-2 text-primary"
            >
              <Plus className="h-3 w-3" />
              Create &ldquo;{search}&rdquo;
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
