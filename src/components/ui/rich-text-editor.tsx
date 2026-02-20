'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table2,
  Link2,
  Link2Off,
  Trash2,
  Plus,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
  className?: string
}

function ToolbarButton({ onClick, active, disabled, title, children, className }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        if (!disabled) onClick()
      }}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center h-7 px-1.5 rounded text-sm transition-colors select-none',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 shrink-0" />
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMarkdown(editor: any): string {
  return editor?.storage?.markdown?.getMarkdown?.() ?? ''
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing here…',
  minHeight = 300,
}: RichTextEditorProps) {
  // Track the last markdown we emitted to avoid syncing our own updates back
  const lastEmittedRef = useRef<string>(value)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      UnderlineExt,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value,
    onUpdate({ editor: e }) {
      const md = getMarkdown(e)
      lastEmittedRef.current = md
      onChange(md)
    },
    editorProps: {
      attributes: {
        class: 'prose-clinical focus:outline-none',
      },
    },
  })

  // Sync external value changes (e.g. parent resets content on cancel)
  useEffect(() => {
    if (!editor) return
    // Skip if this value came from us (prevent loop)
    if (value === lastEmittedRef.current) return
    const current = getMarkdown(editor)
    if (value !== current) {
      editor.commands.setContent(value)
      lastEmittedRef.current = value
    }
  }, [value, editor])

  if (!editor) {
    return <Skeleton className="w-full rounded-md" style={{ height: minHeight + 52 }} />
  }

  const inTable = editor.isActive('table')

  const headingValue = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
    ? 'h3'
    : 'paragraph'

  function setLink() {
    const prev = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt('Enter URL:', prev ?? 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  return (
    <div className="rounded-md border border-border overflow-hidden bg-background">
      {/* ── Main toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        {/* Heading style selector */}
        <select
          value={headingValue}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'paragraph') {
              editor.chain().focus().setParagraph().run()
            } else if (v === 'h1') {
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            } else if (v === 'h2') {
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            } else if (v === 'h3') {
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          }}
          className="text-xs h-7 px-2 rounded border border-border bg-background text-foreground cursor-pointer mr-1 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="paragraph">Normal text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <Divider />

        {/* Bold */}
        <ToolbarButton
          title="Bold (Ctrl+B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          title="Italic (Ctrl+I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>

        {/* Underline */}
        <ToolbarButton
          title="Underline (Ctrl+U)"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Bullet list */}
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>

        {/* Numbered list */}
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Blockquote */}
        <ToolbarButton
          title="Quote / Highlight"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>

        {/* Horizontal rule */}
        <ToolbarButton
          title="Divider line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Insert table */}
        <ToolbarButton
          title="Insert table"
          active={inTable}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <Table2 className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Link */}
        {editor.isActive('link') ? (
          <ToolbarButton
            title="Remove link"
            active
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <Link2Off className="w-3.5 h-3.5" />
          </ToolbarButton>
        ) : (
          <ToolbarButton title="Insert link" onClick={setLink}>
            <Link2 className="w-3.5 h-3.5" />
          </ToolbarButton>
        )}
      </div>

      {/* ── Table context toolbar (shown only when cursor is inside a table) ── */}
      {inTable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-border bg-primary/5 text-xs">
          <span className="text-muted-foreground text-[11px] mr-1 font-medium">Table:</span>

          <ToolbarButton
            title="Add row above"
            onClick={() => editor.chain().focus().addRowBefore().run()}
          >
            <Plus className="w-3 h-3 mr-0.5" />
            <span className="text-[11px]">Row ↑</span>
          </ToolbarButton>

          <ToolbarButton
            title="Add row below"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <Plus className="w-3 h-3 mr-0.5" />
            <span className="text-[11px]">Row ↓</span>
          </ToolbarButton>

          <ToolbarButton
            title="Delete current row"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            <Trash2 className="w-3 h-3 mr-0.5" />
            <span className="text-[11px]">Row</span>
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            title="Add column before"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
          >
            <Plus className="w-3 h-3 mr-0.5" />
            <span className="text-[11px]">Col ←</span>
          </ToolbarButton>

          <ToolbarButton
            title="Add column after"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <Plus className="w-3 h-3 mr-0.5" />
            <span className="text-[11px]">Col →</span>
          </ToolbarButton>

          <ToolbarButton
            title="Delete current column"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            <Trash2 className="w-3 h-3 mr-0.5" />
            <span className="text-[11px]">Col</span>
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            title="Delete entire table"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-0.5" />
            <span className="text-[11px]">Delete table</span>
          </ToolbarButton>
        </div>
      )}

      {/* ── Editor content ── */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="overflow-y-auto cursor-text"
        onClick={() => editor.commands.focus()}
      />
    </div>
  )
}
