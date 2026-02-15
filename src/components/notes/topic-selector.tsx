'use client'

import { useState } from 'react'
import { Folder, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Topic } from '@/types/database'

interface TopicSelectorProps {
  topics: Topic[]
  value: string | null
  onChange: (id: string | null) => void
  onCreateTopic?: (name: string) => Promise<Topic | null>
  className?: string
}

export function TopicSelector({
  topics,
  value,
  onChange,
  onCreateTopic,
  className,
}: TopicSelectorProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const handleCreate = async () => {
    if (!onCreateTopic || !newName.trim()) return
    setCreating(true)
    const topic = await onCreateTopic(newName.trim())
    if (topic) {
      onChange(topic.id)
      setNewName('')
      setShowCreate(false)
    }
    setCreating(false)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <Select value={value ?? 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)}>
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue placeholder="No topic">
              {value ? (
                <span className="flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5" />
                  {topics.find((t) => t.id === value)?.name ?? 'Select topic'}
                </span>
              ) : (
                <span className="text-muted-foreground">No topic</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">No topic</span>
            </SelectItem>
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.id}>
                <span className="flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5" />
                  {topic.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onCreateTopic && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="New topic name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCreate()
              }
              if (e.key === 'Escape') {
                setShowCreate(false)
                setNewName('')
              }
            }}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
