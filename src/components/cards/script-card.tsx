// ScriptCard — canonical script preview used everywhere a script appears.
// Anuj 2026-04-30 v0.6 cards kit.
//
// Densities:
//   compact — ~64px tall: score + title + writer · format
//   list    — ~80px tall: + community-score + review count + Open arrow
//   full    — ~120px tall: + headline preview, full hover state
//   poster  — typographic poster for grid surfaces (Discover). Genre-tinted
//            background, big serif title, italic logline, score chip,
//            avatar+handle byline. CSS-only, no images.

import Link from 'next/link'
import { ScoreBadge } from './score-badge'
import { tintForGenre } from '@/lib/genre-tints'

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
}

function initialsOf(s: ScriptCardData) {
  const src = s.writer_name || s.writer_handle || s.title
  return (src || '·').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
}

export function ScriptCard({ s, density = 'list' }: Props) {
  const href = s.evaluation_id ? `/report/${s.evaluation_id}` : null
  if (!href) return null

  const reviewCount = s.review_count ?? 0
  const reviewLabel = `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`

  if (density === 'poster') {
    const tint = tintForGenre(s.genre)
    const score = s.selznick_score == null ? null : Math.round(Number(s.selznick_score))
    return (
      <Link
        href={href}
        prefetch={false}
        className="group relative flex flex-col rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
        style={{
          background: tint.bg,
          borderColor: tint.border,
          aspectRatio: '4 / 5',
          padding: '18px 18px 16px 18px',
        }}
      >
        {/* Top row: byline (left) + score chip (right) */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {s.writer_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.writer_avatar_url} alt="" className="w-6 h-6 rounded-full object-cover bg-white/60 shrink-0" />
            ) : (
              <div
                className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', fontSize: 10 }}
              >
                {initialsOf(s)}
              </div>
            )}
            <span className="text-[12px] font-semibold truncate" style={{ color: tint.ink }}>
              {s.writer_handle ? `@${s.writer_handle}` : (s.writer_name || '')}
            </span>
          </div>
          {score != null && (
            <div
              className="shrink-0 rounded-md text-white font-extrabold flex flex-col items-center justify-center leading-none"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                width: 40, height: 40,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
              title="GEM score"
            >
              <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 1 }}>GEM</span>
              <span style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
            </div>
          )}
        </div>

        {/* Title + logline take the middle, justified to bottom of free space */}
        <div className="flex-1 min-h-0 flex flex-col justify-end">
          <div
            className="font-bold text-gray-900 leading-[1.05] line-clamp-3"
            style={{ fontFamily: 'Georgia, serif', fontSize: 22 }}
          >
            {s.title}
          </div>
          {s.logline && (
            <div
              className="italic text-gray-700 mt-2 leading-snug line-clamp-3"
              style={{ fontFamily: 'Georgia, serif', fontSize: 12.5 }}
            >
              &ldquo;{s.logline}&rdquo;
            </div>
          )}
        </div>

        {/* Footer chrome */}
        <div
          className="mt-3 pt-2.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{ borderTop: `1px solid ${tint.border}`, color: tint.ink }}
        >
          <span className="truncate">
            {[s.format, s.genre].filter(Boolean).join(' · ') || '—'}
          </span>
          <span className="shrink-0 ml-2 normal-case tracking-normal">
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      </Link>
    )
  }

  if (density === 'compact') {
    return (
      <Link
        href={href}
        prefetch={false}
        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <ScoreBadge score={s.selznick_score} size="sm" kind="selznick" showLabel />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14px] text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</div>
          <div className="text-[11.5px] text-gray-500 truncate">
            {s.format || '—'}
            {s.writer_handle && (
              <> · <span className="text-purple-700 font-semibold">@{s.writer_handle}</span></>
            )}
            <> · {reviewLabel}</>
          </div>
        </div>
      </Link>
    )
  }

  if (density === 'full') {
    return (
      <Link
        href={href}
        prefetch={false}
        className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 transition-colors bg-white"
      >
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
                <span className="text-purple-700 font-semibold">@{s.writer_handle}</span>
              </>
            )}
            <span>·</span>
            <span><strong className="text-gray-800">{reviewCount}</strong> {reviewCount === 1 ? 'review' : 'reviews'}</span>
            {s.avg_peer_score != null && (
              <span>· community <strong className="text-amber-700">{Math.round(s.avg_peer_score)}</strong></span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // list (default) — score, title, logline, format · genre · writer · reviews
  const metaParts: string[] = []
  if (s.format) metaParts.push(s.format)
  if (s.genre) metaParts.push(s.genre)
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
    >
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
              <span className="text-purple-700 font-semibold">@{s.writer_handle}</span>
            </>
          )}
          <span>·</span>
          <span><strong className="text-gray-700">{reviewCount}</strong> {reviewCount === 1 ? 'review' : 'reviews'}</span>
        </div>
      </div>
    </Link>
  )
}
