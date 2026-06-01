'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

interface Props {
  title: string
  /** Full public URL to share */
  url: string
}

export function ShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback: do nothing */ }
  }

  function shareX() {
    const text = encodeURIComponent(title)
    const u = encodeURIComponent(url)
    window.open(`https://x.com/intent/tweet?text=${text}&url=${u}`, '_blank', 'width=550,height=420')
  }

  const btnClass =
    'inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-[rgba(0,0,0,0.06)]'

  return (
    <div className="inline-flex items-center gap-1">
      {/* Copy link */}
      <button
        type="button"
        onClick={copyLink}
        className={btnClass}
        style={{ color: copied ? '#15803d' : '#78716C' }}
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? <Check size={16} /> : <Link2 size={16} />}
      </button>

      {/* Share on X */}
      <button
        type="button"
        onClick={shareX}
        className={btnClass}
        style={{ color: '#78716C' }}
        title="Share on X"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>
    </div>
  )
}
