export default function BrowseWorkspacesLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav skeleton */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/95">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-28 rounded-md bg-muted animate-pulse" />
            <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        {/* Back link skeleton */}
        <div className="h-3.5 w-24 rounded bg-muted animate-pulse mb-5" />

        {/* Page title skeleton */}
        <div className="mb-6">
          <div className="h-7 w-48 rounded bg-muted animate-pulse mb-2" />
          <div className="h-3.5 w-72 rounded bg-muted/60 animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="h-10 flex-1 rounded-md bg-muted animate-pulse" />
          <div className="h-10 w-full sm:w-52 rounded-md bg-muted animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="flex-1 pt-0.5">
                  <div className="h-3.5 w-32 rounded bg-muted animate-pulse mb-2" />
                  <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-4/5 rounded bg-muted animate-pulse" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-4 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-12 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="h-8 w-full rounded-lg bg-muted animate-pulse mt-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
