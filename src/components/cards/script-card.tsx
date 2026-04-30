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
  const display = name || (handle ? `@${handle}` : '')
  const subtitle = name && handle ? `@${handle}` : null

  const inner = (
    <>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover bg-gray-100 shrink-0" />
      ) : (
        <Avatar ini={ini} size={28} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-bold text-gray-900 truncate leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          {display}
        </div>
        {subtitle && (
          <div className="text-[10.5px] text-purple-700 font-semibold truncate leading-tight">
            {subtitle}
          </div>
        )}
      </div>
    </>
  )

  if (!handle) {
    return (
      <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg">
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={`/w/${handle}`}
      prefetch={false}
      className="relative z-10 pointer-events-auto mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-colors"
      title={`Open ${display}'s profile`}
    >
      {inner}
    </Link>
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
          {/* Status pill (owner only) + small inline score chip.
              Shrunk score from 44x44 to a slim pill so the title gets
              full-width breathing room (Anuj 2026-04-30 cleanup). */}
          <div className="flex items-start justify-between gap-2 mb-2.5 min-h-[20px]">
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
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-full text-white font-extrabold leading-none px-2 py-1"
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                }}
                title="GEM score"
              >
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>GEM</span>
                {score}
              </span>
            )}
          </div>

          {/* Title — full width now that score is inline above. */}
          <div
            className="font-bold text-gray-900 leading-[1.2] line-clamp-2"
            style={{ fontFamily: 'Georgia, serif', fontSize: 20, minHeight: '2.4em' }}
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

          {/* Format · Genre · Reviews — small chrome row */}
          <div
            className="mt-3 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] truncate"
            style={{ borderTop: `1px solid ${CARD.border}`, color: CARD.ink }}
          >
            {metaText || '—'}
            <span className="normal-case tracking-normal text-gray-500 font-normal">
              {' · '}
              {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {/* Writer mini-card — interactive byline. Hover state on
              desktop telegraphs that this is a separate click target
              (profile, not the report). Anuj 2026-04-30 v0.8. */}
          <WriterMiniCard
            handle={s.writer_handle}
            name={s.writer_name}
            avatar={s.writer_avatar_url}
          />

          {/* Owner-only Industry stats — compact, single row */}
          {isOwner && (
            <div className="mt-2 flex justify-end">
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
