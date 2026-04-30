'use client'

// Dashboard error boundary — surfaces the actual server error message
// instead of Vercel's generic "page couldn't load" so we can debug.
//
// Anuj 2026-04-30.

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[/dashboard error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Dashboard hit a snag.</h1>
        <p className="text-gray-700 mb-4">
          The page failed to render. Details below — share the message and digest with the team.
        </p>
        <pre className="rounded-lg bg-gray-100 border border-gray-200 p-4 text-xs text-gray-800 whitespace-pre-wrap break-words font-mono mb-4">
          {error.message || 'Unknown error'}
          {error.digest && (
            <>
              {'\n\n'}
              digest: {error.digest}
            </>
          )}
          {error.stack && (
            <>
              {'\n\n'}
              {error.stack.split('\n').slice(0, 12).join('\n')}
            </>
          )}
        </pre>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
