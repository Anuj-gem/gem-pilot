'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

interface Props {
  title: string
  url: string
}

export function ShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function shareX() {
    const text = encodeURIComponent(title)
    const u = encodeURIComponent(url)
    window.open(`https://x.com/intent/tweet?text=${text}&url=${u}`, '_blank', 'width=550,height=420')
  }

  function shareFacebook() {
    const u = encodeURIComponent(url)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, '_blank', 'width=550,height=420')
  }

  const btnStyle = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border border-[#e5e7eb] bg-white transition-colors hover:bg-[#f9fafb] cursor-pointer"

  return (
    <div className="inline-flex items-center gap-1.5">
      <button type="button" onClick={copyLink} className={btnStyle} style={{ color: copied ? '#15803d' : '#374151' }}>
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <button type="button" onClick={shareX} className={btnStyle} style={{ color: '#374151' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X
      </button>
      <button type="button" onClick={shareFacebook} className={btnStyle} style={{ color: '#374151' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
        </svg>
        Facebook
      </button>
    </div>
  )
}
