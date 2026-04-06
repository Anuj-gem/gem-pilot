'use client'

import { useState } from 'react'
import { Facebook, Twitter, Mail, Link2, Check } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

type ShareButtonsProps = {
  evaluationId: string
  title: string
  score?: number | null
  tier?: string | null
  /** Optional override — defaults to current window.location.href */
  url?: string
  className?: string
}

export default function ShareButtons({
  evaluationId,
  title,
  score,
  tier,
  url,
  className = '',
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    url ??
    (typeof window !== 'undefined'
      ? window.location.href
      : `https://www.gem.studio/report/${evaluationId}`)

  const scoreStr = typeof score === 'number' ? Math.round(score).toString() : null
  const tweetText = scoreStr
    ? `I just scored ${scoreStr}/100 on GEM — "${title}"${tier ? ` (${tier})` : ''}. Get your script read in under a minute:`
    : `Just got my script "${title}" read by GEM. Get yours in under a minute:`

  const emailSubject = scoreStr
    ? `My GEM score: ${scoreStr}/100 — "${title}"`
    : `Check out my script on GEM — "${title}"`
  const emailBody = `${tweetText}\n\n${shareUrl}`

  const track = (channel: string) => {
    try {
      trackEvent('report_shared', { channel, evaluationId, title, score, tier })
    } catch {
      /* non-fatal */
    }
  }

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}&url=${encodeURIComponent(shareUrl)}`
  const emailHref = `mailto:?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      track('copy_link')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard denied — silent */
    }
  }

  const btnClass =
    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] hover:border-[var(--gem-gray-500)] hover:bg-[var(--gem-gray-800)] transition-colors'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs uppercase tracking-wider text-[var(--gem-gray-500)] mr-1">
        Share
      </span>
      <a
        href={facebookHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('facebook')}
        aria-label="Share on Facebook"
        className={btnClass}
      >
        <Facebook size={14} />
        Facebook
      </a>
      <a
        href={twitterHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('twitter')}
        aria-label="Share on X/Twitter"
        className={btnClass}
      >
        <Twitter size={14} />
        X
      </a>
      <a
        href={emailHref}
        onClick={() => track('email')}
        aria-label="Share via email"
        className={btnClass}
      >
        <Mail size={14} />
        Email
      </a>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy link"
        className={btnClass}
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}
