'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function LoadingSpinner() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading]   = useState(false)
  const runningRef  = useRef(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevRouteRef = useRef('')

  // Start spinner — deferred with setTimeout to stay outside React's render phase
  function show() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    runningRef.current = true
    setLoading(true)
  }

  // Stop spinner
  function hide() {
    if (!runningRef.current) return
    runningRef.current = false
    // Small delay so it doesn't flicker on instant navigations
    hideTimerRef.current = setTimeout(() => setLoading(false), 150)
  }

  // Intercept pushState (how Next.js triggers all navigations)
  useEffect(() => {
    const orig = window.history.pushState.bind(window.history)
    window.history.pushState = function (...args: Parameters<typeof orig>) {
      orig(...args)
      // Defer so setState is never called inside React's rendering/commit phase
      setTimeout(show, 0)
    }
    return () => {
      window.history.pushState = orig
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hide when route actually changes (navigation complete)
  useEffect(() => {
    const current = pathname + '?' + searchParams.toString()
    if (prevRouteRef.current && prevRouteRef.current !== current) {
      hide()
    }
    prevRouteRef.current = current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  if (!loading) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] rounded-full bg-background/80 border border-border p-2 shadow-lg backdrop-blur-sm">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
    </div>
  )
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <LoadingSpinner />
    </Suspense>
  )
}
