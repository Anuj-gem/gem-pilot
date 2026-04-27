'use client'

// ScriptDownloadButton — producer-side. Calls the gated
// /api/partner/match/[id]/script-url endpoint to mint a short-lived signed
// URL, then opens it in a new tab. Only mounted post-Interested by the
// detail page; the API also enforces the gate.

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface Props {
  matchId: string
}

export function ScriptDownloadButton({ matchId }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/partner/match/${matchId}/script-url`, {
        method: 'GET',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Could not load the script.')
      }
      // Open in new tab — most browsers will then either inline-render the
      // PDF or trigger a download; producer can choose from there.
      window.open(json.url as string, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md font-semibold text-white px-4 py-2.5 text-[13.5px] disabled:opacity-60"
        style={{
          background: 'var(--gem-accent)',
          border: '1px solid var(--gem-accent)',
        }}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} strokeWidth={2.5} />
        )}
        Download script PDF
      </button>
      {error && (
        <p className="mt-2 text-[12px] text-red-600 m-0">{error}</p>
      )}
    </div>
  )
}
