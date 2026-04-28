'use client'

import { useState } from 'react'
import { Mail, Link2, Check } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

function FacebookIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.128 22 16.991 22 12z"/>
    </svg>
  )
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

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

  // Base URL (without tracking params) — canonical share target
  const baseUrl =
    url ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : `https://www.gem.studio/report/${evaluationId}`)

  // Append ?ref=share&channel=X for PostHog funnel tracking
  const withRef = (channel: string) => {
    const sep = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${sep}ref=share&channel=${channel}`
  }

  const scoreStr = typeof score === 'number' ? Math.round(score).toString() : null
  const tweetText = scoreStr
    ? `I just scored ${scoreStr}/100 on GEM — "${title}"${tier ? ` (${tier})` : ''}. Get your script read in under a minute:`
    : `Just got my script "${title}" read by GEM. Get yours in under a minute:`

  const emailSubject = scoreStr
    ? `My GEM Score: ${scoreStr}/100 — "${title}"`
    : `Check out my script on GEM — "${title}"`

  const track = (channel: string) => {
    try {
      trackEvent('report_shared', { channel, evaluationId, title, score, tier })
    } catch {
      /* non-fatal */
    }
  }

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    withRef('facebook')
  )}`
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}&url=${encodeURIComponent(withRef('twitter'))}`
  const emailBody = `${tweetText}\n\n${withRef('email')}`
  const emailHref = `mailto:?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(withRef('copy_link'))
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
        <FacebookIcon size={14} />
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
        <XIcon size={14} />
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
