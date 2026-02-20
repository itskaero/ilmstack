'use client'

import { RichTextEditor } from '@/components/ui/rich-text-editor'

interface NoteEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
}

export function NoteEditor({
  value,
  onChange,
  placeholder = 'Write your clinical note here…',
  height = 500,
}: NoteEditorProps) {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={height}
    />
  )
}

// Dark-mode aware wrapper — kept for backwards compatibility.
// RichTextEditor handles theming via CSS variables so no special handling needed.
export function NoteEditorAdaptive({
  value,
  onChange,
  placeholder,
  height = 500,
}: NoteEditorProps) {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? 'Write your clinical note here…'}
      minHeight={height}
    />
  )
}
