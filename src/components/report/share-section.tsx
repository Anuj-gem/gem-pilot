'use client'
// Share section — copy-link + quick share buttons beneath the Contact Writer
// card. Only renders for public reports (private URLs aren't useful to
// share since non-owners can't view them anyway).
//
// Client component: needs navigator.clipboard + window.location for the URL.
// We hydrate the displayed URL from window on mount so server/client match
// and we can render during SSR without a mismatch.
import { useEffect, useState } from 'react'
import { Link2, Check, Copy } from 'lucide-react'

interface Props {
  evaluationId: string
  title?: string | null
}

export function ShareSection({ evaluationId, title }: Props) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrl(`${window.location.origin}/report/${evaluationId}`)
    }
  }, [evaluationId])

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Silent fail — some browsers block clipboard access in non-secure contexts.
    }
  }

  // Short, neutral share text. Title optional — falls back to a generic line
  // so the tweet still makes sense if we somehow lack a title.
  const shareText = title
    ? `"${title}" on GEM`
    : 'Check out this script report on GEM'

  const tweetHref =
    url &&
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`

  const emailHref =
    url &&
    `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${url}`)}`

  return (
    <div
      className="p-4 sm:p-5 rounded-xl border mb-10"
      style={{
        background: 'linear-gradient(135deg, rgba(148,163,184,0.06), transparent 60%)',
        borderColor: 'rgba(148,163,184,0.25)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={14} className="text-[var(--gem-gray-400)]" />
        <p className="text-[13px] sm:text-sm font-semibold text-[var(--gem-white)] m-0">
          Share this page with others
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-[13px] font-mono truncate"
          style={{
            background: 'rgba(0,0,0,0.02)',
            borderColor: 'var(--gem-gray-700)',
            color: 'var(--gem-gray-300)',
          }}
          title={url}
        >
          {url || 'Loading link…'}
        </div>

        <button
          onClick={handleCopy}
          disabled={!url}
          className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{
            background: copied ? 'rgba(5,150,105,0.12)' : 'var(--gem-accent)',
            color: copied ? '#059669' : '#fff',
          }}
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy link
            </>
          )}
        </button>
      </div>

      {/* Quick share shortcuts — X (tweet intent) and email. Both open in a
          new tab / mail client so the reader never leaves the report. */}
      <div className="flex items-center gap-3 mt-3">
        <a
          href={tweetHref || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors underline decoration-dotted underline-offset-4"
        >
          Share on X
        </a>
        <span className="text-[var(--gem-gray-500)]">·</span>
        <a
          href={emailHref || '#'}
          className="text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors underline decoration-dotted underline-offset-4"
        >
          Share by email
        </a>
      </div>
    </div>
  )
}
