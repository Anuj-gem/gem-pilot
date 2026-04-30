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
import { IndustryStatsButton } from './industry-stats-button'

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
  const display = handle ? `@${handle}` : (name || '')
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

export function ScriptCard({ s, density = 'list', isOwner = false }: Props) {
  const href = s.evaluation_id ? `/report/${s.evaluation_id}` : null
  if (!href) return null

  const reviewCount = s.review_count ?? 0
  const reviewLabel = `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`

  if (density === 'poster') {
    const score = s.selznick_score == null ? null : Math.round(Number(s.selznick_score))
    const metaText = [s.format, s.genre].filter(Boolean).join(' · ')
    const isPublic = !!s.is_public
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
            (No transform/translate on the parent — that breaks
            position:fixed for the IndustryStats modal.) */}
        <Link
          href={href}
          prefetch={false}
          aria-label={s.title}
          className="absolute inset-0 z-0 rounded-xl"
        />

        <div className="relative flex flex-col pointer-events-none p-4">
          {/* Status pill (owner only) + score chip */}
          <div className="flex items-start justify-between gap-2 mb-3">
            {isOwner ? (
              isPublic ? (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-green-800 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-gray-600 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                  Private
                </span>
              )
            ) : (
              <span />
            )}
            {score != null && (
              <div
                className="shrink-0 rounded-md text-white font-extrabold flex flex-col items-center justify-center leading-none"
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  width: 44, height: 44,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
                title="GEM score"
              >
                <span style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 1 }}>GEM</span>
                <span style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
              </div>
            )}
          </div>

          {/* Title — orienting element */}
          <div
            className="font-bold text-gray-900 leading-[1.15] line-clamp-2"
            style={{ fontFamily: 'Georgia, serif', fontSize: 19 }}
          >
            {s.title}
          </div>

          {/* Logline */}
          {s.logline && (
            <div
              className="italic text-gray-700 mt-2 leading-snug line-clamp-3"
              style={{ fontFamily: 'Georgia, serif', fontSize: 13 }}
            >
              &ldquo;{s.logline}&rdquo;
            </div>
          )}

          {/* Divider */}
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${CARD.border}` }}>
            {/* Byline */}
            <WriterLink
              handle={s.writer_handle}
              name={s.writer_name}
              avatar={s.writer_avatar_url}
              ink={CARD.ink}
            />
            {/* Meta line — format · genre · reviews */}
            <div
              className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] truncate"
              style={{ color: CARD.ink }}
            >
              {metaText || '—'}
              <span className="normal-case tracking-normal text-gray-500 font-normal">
                {' · '}
                {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>

          {/* Owner-only Industry stats — clean footer */}
          {isOwner && (
            <div className="mt-3 -mx-4 -mb-4 px-4 py-2.5 border-t bg-white/40 rounded-b-xl flex items-center justify-between gap-2"
              style={{ borderColor: CARD.border }}
            >
              <span className="text-[10.5px] uppercase tracking-[0.08em] font-bold text-gray-500">
                Industry
              </span>
              <IndustryStatsButton submissionId={s.submission_id} />
            </div>
          )}
        </div>
      </div>
    )
  }

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
                  <WriterLink handle={s.writer_handle} name={null} dark />
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
                  <WriterLink handle={s.writer_handle} name={null} dark />
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
                <WriterLink handle={s.writer_handle} name={null} dark />
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
