'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamic import to avoid SSR issues with the markdown editor
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-md" />,
})

interface NoteEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
}

export function NoteEditor({
  value,
  onChange,
  placeholder = 'Write your clinical note in Markdown…',
  height = 500,
}: NoteEditorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Skeleton className="w-full rounded-md" style={{ height }} />
  }

  return (
    <div data-color-mode="light" className="dark:[&]:hidden">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? '')}
        height={height}
        preview="live"
        textareaProps={{ placeholder }}
        visibleDragbar={false}
      />
    </div>
  )
}

// Separate dark-mode aware wrapper
export function NoteEditorAdaptive({
  value,
  onChange,
  placeholder,
  height = 500,
}: NoteEditorProps) {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(document.documentElement.classList.contains('dark') || mq.matches)
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  if (!mounted) {
    return <Skeleton className="w-full rounded-md" style={{ height }} />
  }

  return (
    <div data-color-mode={isDark ? 'dark' : 'light'}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? '')}
        height={height}
        preview="live"
        textareaProps={{ placeholder: placeholder ?? 'Write your clinical note in Markdown…' }}
        visibleDragbar={false}
      />
    </div>
  )
}
