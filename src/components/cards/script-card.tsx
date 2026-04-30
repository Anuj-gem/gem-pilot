// ScriptCard — canonical script preview used everywhere a script appears.
// Anuj 2026-04-29 v0.5 cards kit.
//
// Three densities:
//   compact — ~64px tall: score + title + writer · format
//   list    — ~80px tall: + community-score + review count + Open arrow
//   full    — ~120px tall: + headline preview, full hover state

import Link from 'next/link'
import { ScoreBadge } from './score-badge'

export interface ScriptCardData {
  submission_id: string
  evaluation_id: string | null
  title: string
  format: string | null
  selznick_score: number | null
  tier?: string | null
  headline?: string | null
  // Writer
  writer_handle: string | null
  writer_name: string | null
  // Community
  review_count?: number
  avg_peer_score?: number | null
}

interface Props {
  s: ScriptCardData
  density?: 'compact' | 'list' | 'full'
}

export function ScriptCard({ s, density = 'list' }: Props) {
  const href = s.evaluation_id ? `/report/${s.evaluation_id}` : null
  if (!href) return null

  const showCommunity = (s.review_count ?? 0) >= 1

  if (density === 'compact') {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <ScoreBadge score={s.selznick_score} size="sm" kind="selznick" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14px] text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</div>
          <div className="text-[11.5px] text-gray-500 truncate">
            {s.format || '—'}
            {s.writer_handle && (
              <> · <span className="text-purple-700 font-semibold">@{s.writer_handle}</span></>
            )}
          </div>
        </div>
      </Link>
    )
  }

  if (density === 'full') {
    return (
      <Link
        href={href}
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
            {showCommunity && (
              <>
                <span>·</span>
                <span><strong className="text-gray-800">{s.review_count}</strong> {s.review_count === 1 ? 'review' : 'reviews'}</span>
                {s.avg_peer_score != null && (
                  <span>· community <strong className="text-amber-700">{Math.round(s.avg_peer_score)}</strong></span>
                )}
              </>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // list (default)
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      <ScoreBadge score={s.selznick_score} size="md" kind="selznick" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px] text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</div>
        <div className="text-[12px] text-gray-500 truncate">
          {s.format || '—'}
          {s.writer_handle && (
            <> · <span className="text-purple-700 font-semibold">@{s.writer_handle}</span></>
          )}
        </div>
      </div>
      {showCommunity ? (
        <div className="shrink-0 flex items-center gap-2 text-right">
          {s.avg_peer_score != null && (
            <ScoreBadge score={s.avg_peer_score} size="sm" kind="community" />
          )}
          <div className="text-[11px] text-gray-500 leading-tight">
            <div className="font-semibold text-gray-700 tabular-nums">{s.review_count}</div>
            <div>{s.review_count === 1 ? 'review' : 'reviews'}</div>
          </div>
        </div>
      ) : (
        <span className="text-[11px] font-semibold text-purple-700 shrink-0 opacity-0 group-hover:opacity-100">Open →</span>
      )}
    </Link>
  )
}
