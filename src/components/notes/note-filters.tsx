'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Topic, Tag, NoteStatus } from '@/types/database'

const NOTE_STATUSES: { value: NoteStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

interface NoteFiltersProps {
  topics: Topic[]
  tags: Tag[]
}

export function NoteFilters({ topics, tags }: NoteFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') as NoteStatus | null
  const currentTopic = searchParams.get('topic')
  const currentTag = searchParams.get('tag')
  const currentSearch = searchParams.get('search') ?? ''

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const clearAll = () => {
    router.push(pathname)
  }

  const hasFilters = currentStatus || currentTopic || currentTag || currentSearch

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search notes…"
          className="pl-8 h-8 text-sm"
          defaultValue={currentSearch}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateParam('search', (e.target as HTMLInputElement).value || null)
            }
          }}
          onBlur={(e) => {
            if (e.target.value !== currentSearch) {
              updateParam('search', e.target.value || null)
            }
          }}
        />
      </div>

      {/* Status filter */}
      <Select
        value={currentStatus ?? 'all'}
        onValueChange={(v) => updateParam('status', v === 'all' ? null : v)}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {NOTE_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Topic filter */}
      {topics.length > 0 && (
        <Select
          value={currentTopic ?? 'all'}
          onValueChange={(v) => updateParam('topic', v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Tag pills */}
      {tags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() =>
                  updateParam('tag', currentTag === tag.id ? null : tag.id)
                }
                className="focus:outline-none"
              >
                <Badge
                  variant={currentTag === tag.id ? 'default' : 'outline'}
                  className="text-xs cursor-pointer"
                  style={
                    currentTag !== tag.id
                      ? { borderColor: tag.color + '60', color: tag.color }
                      : { backgroundColor: tag.color, borderColor: tag.color }
                  }
                >
                  {tag.name}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={clearAll}
        >
          <X className="h-3 w-3 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
