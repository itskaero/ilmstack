'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import type { JournalWithEntries } from '@/types/database'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  journal: JournalWithEntries
  workspaceName: string
}

export function PrintView({ journal, workspaceName }: Props) {
  const monthName = MONTH_NAMES[journal.period_month - 1]

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Print button (hidden on print) */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1.5" />
          Print / Save as PDF
        </Button>
        <Button variant="outline" onClick={() => window.close()}>
          Close
        </Button>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1in; size: A4; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Cover / Header */}
      <div className="max-w-2xl mx-auto px-8 py-12 print:px-0 print:py-0">
        <header className="text-center border-b-2 border-black pb-8 mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-2">{workspaceName}</p>
          <h1 className="text-3xl font-bold mb-2">{journal.title}</h1>
          <p className="text-lg text-gray-600">
            {monthName} {journal.period_year}
          </p>
          {journal.published_at && (
            <p className="text-xs text-gray-400 mt-2">
              Published {new Date(journal.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </header>

        {/* Editorial note */}
        {journal.editorial_note && (
          <section className="mb-8">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-500 mb-3">
              Editor&apos;s Note
            </h2>
            <p className="text-sm leading-relaxed italic text-gray-700 border-l-2 border-gray-300 pl-4">
              {journal.editorial_note}
            </p>
          </section>
        )}

        {/* Table of Contents */}
        {journal.entries.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-500 mb-3">
              Contents
            </h2>
            <ol className="space-y-2">
              {journal.entries.map((entry, i) => (
                <li key={entry.id} className="flex items-baseline gap-2 text-sm">
                  <span className="text-gray-400 font-mono text-xs w-6 shrink-0">{i + 1}.</span>
                  <span className="font-medium">{entry.note?.title ?? 'Untitled'}</span>
                  {entry.featured && (
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-gray-300 px-1.5 py-0 rounded">
                      Featured
                    </span>
                  )}
                  <span className="flex-1 border-b border-dotted border-gray-300 mx-1" />
                  <span className="text-xs text-gray-500 shrink-0">
                    {entry.note?.author?.full_name ?? 'Unknown'}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Articles */}
        {journal.entries.map((entry, i) => (
          <article key={entry.id} className={i > 0 ? 'page-break' : ''}>
            <div className="border-t border-gray-200 pt-8 mb-8">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-gray-400 font-mono">Article {i + 1}</span>
                {entry.featured && (
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">Featured</span>
                )}
              </div>
              <h2 className="text-xl font-bold mb-1">{entry.note?.title ?? 'Untitled'}</h2>
              <p className="text-sm text-gray-500 mb-4">
                {entry.note?.author?.full_name ?? 'Unknown'}
                {entry.note?.topic && ` · ${entry.note.topic.name}`}
                {entry.note?.created_at && ` · ${new Date(entry.note.created_at).toLocaleDateString()}`}
              </p>

              {/* Tags */}
              {entry.note?.tags && entry.note.tags.length > 0 && (
                <div className="flex gap-1.5 mb-4 flex-wrap">
                  {entry.note.tags.map((tag: any) => (
                    <span key={tag.id} className="text-[10px] text-gray-600 border border-gray-300 rounded px-1.5 py-0.5">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Note content */}
              {entry.note?.content_html ? (
                <div
                  className="prose prose-sm max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: entry.note.content_html }}
                />
              ) : entry.note?.content ? (
                <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {entry.note.content}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No content available.</p>
              )}
            </div>
          </article>
        ))}

        {/* Footer */}
        <footer className="border-t-2 border-black pt-6 mt-12 text-center text-xs text-gray-400">
          <p>
            {workspaceName} · {journal.title} · {monthName} {journal.period_year}
          </p>
          <p className="mt-1">Generated by Clinical Ledger</p>
        </footer>
      </div>
    </div>
  )
}
