'use client'
// ScriptCard — canonical script preview used everywhere a script appears.
// Anuj 2026-04-30 v0.6 cards kit.
//
// Densities:
//   compact — score + title + writer · format (small surface)
//   list    — score + title + logline + meta row
//   full    — large variant with headline preview
//   poster  — typographic poster for grid surfaces (Discover). Warm cream
//            background, big serif title, italic logline, score chip,
//            avatar+handle byline.
//
// Click model
// -----------
// Card body navigates to the report. Writer byline navigates to the
// writer's profile. We use the overlay-link pattern: an absolutely-
// positioned <Link> covers the card surface, and the writer byline is a
// separately layered <Link> with `relative z-10` so its click is not
// captured by the overlay.

import Link from 'next/link'
import { ScoreBadge } from './score-badge'
// IndustryStatsButton hidden — opportunities-v1 strips industry stats.
// import { IndustryStatsButton } from './industry-stats-button'
import { OwnerActionsMenu } from '@/components/report/owner-actions-menu'

export interface ScriptCardData {
  submission_id: string
  evaluation_id: string | null
  title: string
  format: string | null
  genre?: string | null
  logline?: string | null
  selznick_score: number | null
  tier?: string | null
  headline?: string | null
  /** Whether the submission is currently visible on Discover. Used to
   *  drive the "Published / Private" pill on owner-viewed cards. */
  is_public?: boolean
  /** Per-script privacy toggles — needed to hydrate the owner triple-dot
   *  menu on dashboard cards. (Anuj 2026-04-30 v0.10.12.) */
  allow_reviews?: boolean
  allow_industry?: boolean
  /** Whether the score badge should render to non-owners. Pulled from
   *  report_privacy.show_score. Defaults to true when unset. Owners
   *  always see their own score regardless. (Anuj 2026-05-01 v0.12.3) */
  score_visible?: boolean
  /** Per-script industry-activity rows surfaced in the menu's "Industry
   *  activity" item. Optional — when omitted the item doesn't render. */
  industry_activity?: import('@/components/dashboard/industry-activity-button').IndustryActivityRow[]
  // Writer
  writer_handle: string | null
  writer_name: string | null
  writer_avatar_url?: string | null
  // Community
  review_count?: number
  avg_peer_score?: number | null
}

interface Props {
  s: ScriptCardData
  density?: 'compact' | 'list' | 'full' | 'poster'
  /** Whether the viewer owns this script. Owner-only chrome
   *  (e.g. Industry stats button) is gated on this flag. */
  isOwner?: boolean
  /** Script is locked behind the Pro paywall (2nd+ script for free users).
   *  Shows title + logline teaser with upgrade CTA, no edit/menu. */
  isLocked?: boolean
  /** Script is still being evaluated. Shows spinner + processing label. */
  isProcessing?: boolean
  /** This is the user's first free evaluation — show "Free evaluation" badge
   *  and messaging that they get full access on this one. */
  isFreePost?: boolean
  /** Whether the viewer is a GEM insider (Pro member). When false on
   *  leaderboard cards, author names are blurred and report links locked. */
  isInsider?: boolean
}

function initialsOf(s: ScriptCardData) {
  const src = s.writer_name || s.writer_handle || s.title
  return (src || '·').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
}

// Single shared palette for every script card. Light, neutral, pastel —
// no warm cream/amber. The page sits on a soft cool off-white; cards
// render pure white with a hairline border so the score chip and title
// can carry the visual weight (Anuj 2026-04-30).
const CARD = {
  bg:     '#FFFFFF',  // white
  border: '#E5E7EB',  // gray-200
  ink:    '#6B7280',  // gray-500 chrome text
}

/**
 * WriterLink — small reusable byline link. Sits above the overlay-link
 * via `relative z-10`. Stops propagation so clicks don't bubble to a
 * parent's onClick (rare here but safe).
 */
function WriterLink({
  handle, name, avatar, ink, dark,
}: {
  handle: string | null
  name: string | null
  avatar?: string | null
  ink?: string
  dark?: boolean
}) {
  if (!handle && !name) return null
  const ini = (name || handle || '·').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
  // Anuj 2026-04-30 v0.10.8: prefer name, fall back to @handle only when
  // there's no name. Cards across the platform should de-emphasize the
  // handle (it's still the URL, just not the display string).
  const display = name || (handle ? `@${handle}` : '')
  const colorClass = dark ? 'text-purple-700 hover:underline' : ''
  if (!handle) {
    // No handle = no profile to link to; render as plain text.
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={ink ? { color: ink } : undefined}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover bg-white/60 shrink-0" />
        ) : (
          <Avatar ini={ini} size={20} />
        )}
        <span className="truncate">{display}</span>
      </span>
    )
  }
  return (
    <Link
      href={`/w/${handle}`}
      prefetch={false}
      className={`relative z-10 inline-flex items-center gap-1.5 text-[12px] font-semibold hover:underline pointer-events-auto ${colorClass}`}
      style={ink ? { color: ink } : undefined}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover bg-white/60 shrink-0" />
      ) : (
        <Avatar ini={ini} size={20} />
      )}
      <span className="truncate">{display}</span>
    </Link>
  )
}

function Avatar({ ini, size }: { ini: string; size: number }) {
  return (
    <div
      className="rounded-full text-white flex items-center justify-center font-bold shrink-0"
      style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {ini}
    </div>
  )
}

/**
 * ScorePill — compact score readout: "69 / 100".
 * Anuj 2026-04-30 v0.9: dropped the "GEM SCORE" label in favor of an
 * out-of-100 readout so the pill is small enough to leave the writer
 * name room to breathe in the footer.
 */
function ScorePill({ score }: { score: number }) {
  return (
    <span
      className="shrink-0 inline-flex items-baseline gap-0.5 rounded-full text-white font-extrabold leading-none px-2.5 py-1.5"
      style={{
        background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        fontVariantNumeric: 'tabular-nums',
      }}
      title={`GEM score: ${score} out of 100`}
    >
      <span style={{ fontSize: 14 }}>{score}</span>
      <span style={{ fontSize: 9, opacity: 0.75, fontWeight: 600 }}>/100</span>
    </span>
  )
}

/**
 * WriterMiniCard — full-width byline tile on poster cards. Clickable,
 * sits ABOVE the overlay-link via z-10 so its click goes to the writer
 * profile (not the report). Hover state on desktop signals it's a
 * separate target. Shows display name first, handle subtitle below.
 *
 * Anuj 2026-04-30 v0.8.
 */
function WriterMiniCard({
  handle, name, avatar,
}: {
  handle: string | null
  name: string | null
  avatar?: string | null
}) {
  if (!handle && !name) return null
  const ini = (name || handle || '·').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
  // Anuj 2026-04-30 v0.10.8: dropped the @handle subtitle. Handle is
  // de-emphasized across the platform — display name does the heavy
  // lifting on cards. Handle still routes the profile link.
  const display = name || (handle ? `@${handle}` : '')

  const inner = (
    <>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-100 shrink-0" />
      ) : (
        <Avatar ini={ini} size={24} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-gray-900 leading-tight line-clamp-1" style={{ fontFamily: 'Georgia, serif' }}>
          {display}
        </div>
      </div>
    </>
  )

  if (!handle) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={`/w/${handle}`}
      prefetch={false}
      className="relative z-10 pointer-events-auto flex items-center gap-2 min-w-0 -mx-1 px-1 py-1 rounded-md hover:bg-gray-50 transition-colors"
      title={`Open ${display}'s profile`}
    >
      {inner}
    </Link>
  )
}

export function ScriptCard({ s, density = 'list', isOwner = false, isLocked = false, isProcessing = false, isFreePost = false, isInsider = true }: Props) {
  const href = s.evaluation_id ? `/report/${s.evaluation_id}` : null
  // Processing scripts have no eval yet — don't bail, render a processing card
  if (!href && !isProcessing) return null

  const reviewCount = s.review_count ?? 0
  const reviewLabel = `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`

  if (density === 'poster') {
    // ── PROCESSING STATE ─────────────────────────────────────
    // Script submitted but evaluation not yet complete. Show the
    // title with a spinner so the user knows it's working.
    if (isProcessing) {
      return (
        <div
          className="group relative flex flex-col rounded-xl border"
          style={{ background: CARD.bg, borderColor: CARD.border }}
        >
          <div className="relative flex flex-col p-5">
            <div
              className="font-bold text-gray-900 leading-[1.2] line-clamp-3"
              style={{ fontFamily: 'Georgia, serif', fontSize: 20, minHeight: '3.6em' }}
            >
              {s.title}
            </div>
            <div className="mt-4 pt-3 flex items-center gap-2.5" style={{ borderTop: `1px solid ${CARD.border}` }}>
              <svg className="animate-spin h-4 w-4 text-purple-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-[13px] font-semibold text-purple-700">
                Evaluating your script…
              </span>
            </div>
            <p className="text-[12px] text-gray-500 mt-2 leading-snug">
              This usually takes under a minute. Feel free to explore the community while you wait.
            </p>
          </div>
        </div>
      )
    }

    // ── LOCKED STATE (2nd+ script, free user) ────────────────
    // Show title + logline as a teaser. No edit, no menu, no
    // view-report. Clear upgrade CTA.
    if (isLocked) {
      return (
        <div
          className="group relative flex flex-col rounded-xl border"
          style={{ background: CARD.bg, borderColor: CARD.border }}
        >
          <div className="relative flex flex-col p-5">
            {/* Locked badge */}
            <div className="inline-flex items-center gap-1.5 mb-3">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.12em] font-bold"
                style={{ background: '#FEF3C7', color: '#92400E' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
                </svg>
                Upgrade to unlock
              </span>
            </div>

            <div
              className="font-bold text-gray-900 leading-[1.2] line-clamp-3"
              style={{ fontFamily: 'Georgia, serif', fontSize: 20, minHeight: '3.6em' }}
            >
              {s.title}
            </div>

            {s.logline && (
              <p className="text-[14px] text-gray-500 mt-2.5 leading-[1.5] line-clamp-2 m-0">
                {s.logline}
              </p>
            )}

            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${CARD.border}` }}>
              <p className="text-[13px] text-gray-600 leading-snug mb-3">
                Your report is ready. Upgrade to view it, submit to industry opportunities, and evaluate unlimited scripts.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
                className="relative z-10 pointer-events-auto w-full inline-flex items-center justify-center gap-2 text-[12.5px] font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 transition-colors"
              >
                Become a Member — $20/mo
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Score badge respects report_privacy.show_score for non-owners.
    // Owner always sees their own score. Anuj 2026-05-01 v0.12.3.
    const scoreVisibleToViewer = isOwner || s.score_visible !== false
    const score =
      s.selznick_score == null || !scoreVisibleToViewer
        ? null
        : Math.round(Number(s.selznick_score))
    const isPublic = !!s.is_public
    // Submit-review CTA only renders when the writer has reviews on.
    const reviewsAllowed = s.allow_reviews !== false
    // Meta line components — small-caps, owner status inline as TEXT
    // (not a pill) per Layout B. (Anuj 2026-04-30 council redesign.)
    const metaParts = [
      isOwner ? (isPublic ? 'Published' : 'Private') : null,
      s.format,
      s.genre,
    ].filter(Boolean) as string[]

    return (
      <div
        className="group relative flex flex-col rounded-xl border transition-shadow hover:shadow-md"
        style={{
          background: CARD.bg,
          borderColor: CARD.border,
        }}
      >
        {/* Overlay link — full card click target → report. Lives below
            interactive children (z-10) so they get clicks first.
            Non-insiders can't click through — report is gated. */}
        {href && isInsider && (
          <Link
            href={href}
            prefetch={false}
            aria-label={s.title}
            className="absolute inset-0 z-0 rounded-xl"
          />
        )}

        <div className="relative flex flex-col pointer-events-none p-5">
          {/* FREE POST BADGE — first eval for trial users */}
          {isFreePost && isOwner && (
            <div className="inline-flex items-center gap-1.5 mb-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.12em] font-bold"
                style={{ background: '#ECFDF5', color: '#065F46' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clipRule="evenodd" />
                </svg>
                Your free evaluation — full access
              </span>
            </div>
          )}

          {/* TITLE — 3-line clamp so most titles fit without
              cutting off (Anuj 2026-04-30 v0.9). */}
          <div
            className="font-bold text-gray-900 leading-[1.2] line-clamp-3"
            style={{ fontFamily: 'Georgia, serif', fontSize: 20, minHeight: '3.6em' }}
          >
            {s.title}
          </div>

          {/* LOGLINE — article-preview style: clean sans-serif body text,
              no italics, no smart-quotes, no tiny pull-quote serif. Reads
              like a story dek under the headline (Anuj 2026-04-30 v0.10.4
              — "the weird italic font in quotes was hard to read"). */}
          {s.logline && (
            <p
              className="text-[14px] text-gray-700 mt-2.5 leading-[1.5] line-clamp-4 m-0"
              style={{ minHeight: '4.5em' }}
            >
              {s.logline}
            </p>
          )}

          {/* META STRIP — small caps, status inline (owner only),
              format · genre · review count. No pills here. */}
          <div
            className="mt-4 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] truncate"
            style={{ borderTop: `1px solid ${CARD.border}`, color: CARD.ink }}
          >
            {metaParts.join(' · ') || '—'}
          </div>

          {/* WRITER + SCORE — verdict-at-the-bottom pattern (Letterboxd). */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {isInsider ? (
                <WriterMiniCard
                  handle={s.writer_handle}
                  name={s.writer_name}
                  avatar={s.writer_avatar_url}
                />
              ) : (
                /* Non-insider: blur the author name */
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
                  <div className="text-[12px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif', filter: 'blur(5px)', userSelect: 'none' }}>
                    {s.writer_name || 'Writer Name'}
                  </div>
                </div>
              )}
            </div>
            {score != null && (
              <div className="shrink-0">
                <ScorePill score={score} />
              </div>
            )}
          </div>

          {/* ACTION ROW — opportunities-v1: industry stats button removed for owners.
              Non-owner: Submit review (left) + View report (right). */}
          <div className="mt-3.5 pt-3 flex items-center gap-2" style={{ borderTop: `1px solid ${CARD.border}` }}>
            <span className="flex-1" />
            {/* Owner triple-dot — privacy + industry activity props
                removed (opportunities-v1). */}
            {isOwner && s.evaluation_id && (
              <div className="relative z-10 pointer-events-auto">
                <OwnerActionsMenu
                  submissionId={s.submission_id}
                  evaluationId={s.evaluation_id}
                  title={s.title}
                  declaredFormat={
                    s.format === 'Feature film' || s.format === 'Series' ? s.format : null
                  }
                  isSubscribed={true}
                  editHref={`/report/${s.evaluation_id}?edit=1`}
                  downloadHref={`/report/${s.evaluation_id}?download=1`}
                />
              </div>
            )}
            {href && isInsider && (
              <Link
                href={href}
                prefetch={false}
                className="relative z-10 pointer-events-auto inline-flex items-center justify-center gap-1.5 text-[11.5px] font-bold rounded-md bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 transition-colors"
              >
                View report →
              </Link>
            )}
            {href && !isInsider && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
                className="relative z-10 pointer-events-auto inline-flex items-center justify-center gap-1.5 text-[11.5px] font-bold rounded-md bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 transition-colors border-none cursor-pointer"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" /></svg>
                Insiders only
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Non-poster densities require a valid href (completed eval).
  if (!href) return null

  if (density === 'compact') {
    return (
      <div className="relative flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
        <Link href={href} prefetch={false} aria-label={s.title} className="absolute inset-0 z-0" />
        <div className="relative flex items-center gap-3 w-full pointer-events-none">
          <ScoreBadge score={s.selznick_score} size="sm" kind="selznick" showLabel />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px] text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</div>
            <div className="text-[11.5px] text-gray-500 truncate flex items-center gap-1.5 flex-wrap">
              <span>{s.format || '—'}</span>
              {s.writer_handle && (
                <>
                  <span>·</span>
                  <WriterLink handle={s.writer_handle} name={s.writer_name} dark />
                </>
              )}
              <span>·</span>
              <span>{reviewLabel}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (density === 'full') {
    return (
      <div className="relative flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 transition-colors bg-white">
        <Link href={href} prefetch={false} aria-label={s.title} className="absolute inset-0 z-0 rounded-xl" />
        <div className="relative flex items-start gap-4 w-full pointer-events-none">
          <ScoreBadge score={s.selznick_score} size="lg" kind="selznick" showLabel />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px] text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</div>
            {s.headline && (
              <div className="text-[13px] text-gray-700 mt-1.5 leading-snug line-clamp-2">{s.headline}</div>
            )}
            <div className="text-[12px] text-gray-500 mt-2 flex items-center gap-2 flex-wrap">
              <span>{s.format || '—'}</span>
              {s.writer_handle && (
                <>
                  <span>·</span>
                  <WriterLink handle={s.writer_handle} name={s.writer_name} dark />
                </>
              )}
              <span>·</span>
              <span><strong className="text-gray-800">{reviewCount}</strong> {reviewCount === 1 ? 'review' : 'reviews'}</span>
              {s.avg_peer_score != null && (
                <span>· community <strong className="text-gray-700">{Math.round(s.avg_peer_score)}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // list (default) — score, title, logline, format · genre · writer · reviews
  const metaParts: string[] = []
  if (s.format) metaParts.push(s.format)
  if (s.genre) metaParts.push(s.genre)
  return (
    <div className="relative flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
      <Link href={href} prefetch={false} aria-label={s.title} className="absolute inset-0 z-0 rounded-xl" />
      <div className="relative flex items-start gap-3 w-full pointer-events-none">
        <ScoreBadge score={s.selznick_score} size="md" kind="selznick" showLabel />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</div>
          {s.logline && (
            <div className="text-[12.5px] text-gray-700 leading-snug mt-0.5 line-clamp-2">{s.logline}</div>
          )}
          <div className="text-[11.5px] text-gray-500 mt-1 truncate flex items-center gap-1.5 flex-wrap">
            {metaParts.length > 0 && <span>{metaParts.join(' · ')}</span>}
            {s.writer_handle && (
              <>
                {metaParts.length > 0 && <span>·</span>}
                <WriterLink handle={s.writer_handle} name={s.writer_name} dark />
              </>
            )}
            <span>·</span>
            <span><strong className="text-gray-700">{reviewCount}</strong> {reviewCount === 1 ? 'review' : 'reviews'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
