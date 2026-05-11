'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, FileText, ArrowRight } from 'lucide-react'

const DEAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  option:         { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  purchase:       { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  representation: { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  co_finance:     { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
}

const DEAL_LABELS: Record<string, string> = {
  option: 'Option Deal',
  purchase: 'Purchase',
  representation: 'Representation',
  co_finance: 'Production Finance',
}

const PERSPECTIVE_LABELS: Record<string, string> = {
  producer: 'Producer',
  lit_rep: 'Literary Representative',
  actor_rep: 'Talent Representative',
  financier: 'Financier',
}

const GENRE_LABELS: Record<string, string> = {
  thriller: 'Thriller', crime: 'Crime', horror: 'Horror', drama: 'Drama',
  comedy: 'Comedy', 'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', romance: 'Romance',
  action: 'Action', family: 'Family', western: 'Western', musical: 'Musical',
}

const STAGE_DISPLAY: Record<string, { label: string; bg: string; text: string }> = {
  pending:       { label: 'Application Pending', bg: '#fef3c7', text: '#92400e' },
  submitted:     { label: 'Application Pending', bg: '#fef3c7', text: '#92400e' },
  in_review:     { label: 'In Review',           bg: '#dbeafe', text: '#1e40af' },
  partner_match: { label: 'Partner Match',       bg: '#ede9fe', text: '#5b21b6' },
  complete:      { label: 'Reviewed',            bg: '#d1fae5', text: '#065f46' },
}

export interface QualScript {
  id: string
  title: string | null
  score: number | null
  format: string | null
}

interface Props {
  id: string
  slug: string | null
  title: string
  description: string
  deal_type: string | null
  perspective: string | null
  posted_by: string | null
  genres: string[]
  formats: string[]
  budget_tiers: string[]
  min_score: number | null
  deadline: string | null
  // User-specific
  review_stage: string | null  // null = not applied
  qualifying_scripts: QualScript[]
  is_pro: boolean
  is_logged_in: boolean
}

function formatDeadline(d: string) {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Closed'
  if (days === 1) return 'Closes tomorrow'
  if (days <= 7) return `${days} days left`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function OpportunityListingCard({
  id, slug, title, description, deal_type, perspective, posted_by,
  genres, formats, budget_tiers, min_score, deadline,
  review_stage, qualifying_scripts, is_pro, is_logged_in,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const colors = deal_type ? DEAL_COLORS[deal_type] : null
  const dealLabel = deal_type ? DEAL_LABELS[deal_type] : null
  const perspLabel = perspective ? PERSPECTIVE_LABELS[perspective] : null
  const stageInfo = review_stage && review_stage !== 'draft' ? STAGE_DISPLAY[review_stage] : null
  const hasApplied = !!stageInfo
  const qualCount = qualifying_scripts.length
  const href = `/opportunities/${slug ?? id}`

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden transition-shadow hover:shadow-lg"
      style={{ border: '1.5px solid #e5e7eb' }}
    >
      <div className="px-6 py-5">
        {/* Row 1: Deal badge + byline */}
        <div className="flex items-center justify-between gap-3 mb-3">
          {dealLabel && colors ? (
            <span
              className="text-[12px] font-bold uppercase tracking-wide px-3 py-1 rounded-md"
              style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
            >
              {dealLabel}
            </span>
          ) : (
            <span />
          )}
          {posted_by && (
            <span className="text-[13px] text-gray-500 font-medium">
              {posted_by}{perspLabel ? ` — ${perspLabel}` : ''}
            </span>
          )}
        </div>

        {/* Row 2: Title — the hero */}
        <Link href={href} className="block group">
          <h3
            className="text-[20px] font-bold text-gray-900 m-0 leading-snug group-hover:text-purple-700 transition-colors"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {title}
          </h3>
        </Link>

        {/* Row 3: Description */}
        <p className="text-[14px] text-gray-500 m-0 mt-2 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Row 4: Genre pills + format + budget */}
        {(genres.length > 0 || formats.length > 0 || budget_tiers.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {genres.slice(0, 4).map(g => (
              <span key={g} className="text-[12px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {GENRE_LABELS[g] ?? g}
              </span>
            ))}
            {formats.map(f => (
              <span key={f} className="text-[12px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                {f === 'feature' ? 'Feature' : f === 'pilot' ? 'Pilot' : f === 'limited_series' ? 'Limited Series' : f === 'short' ? 'Short' : f}
              </span>
            ))}
            {budget_tiers.slice(0, 1).map(b => (
              <span key={b} className="text-[12px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {b.charAt(0).toUpperCase() + b.slice(1)} budget
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-100 mt-4 mb-3" />

        {/* Row 5: Qualification bar + status + deadline */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Score requirement */}
            {min_score != null && (
              <span className="text-[13px] font-bold text-gray-700">
                Requires {Math.round(min_score)}+ score
              </span>
            )}
            {/* Deadline */}
            {deadline && (
              <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${
                Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000) <= 7
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-50 text-gray-400 border border-gray-200'
              }`}>
                {formatDeadline(deadline)}
              </span>
            )}
          </div>

          {/* Right side: status or action */}
          <div className="flex items-center gap-2">
            {hasApplied && stageInfo ? (
              <span
                className="text-[12px] font-bold px-3 py-1 rounded-full"
                style={{ background: stageInfo.bg, color: stageInfo.text }}
              >
                {stageInfo.label}
              </span>
            ) : is_logged_in ? (
              qualCount > 0 ? (
                is_pro ? (
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white px-4 py-1.5 rounded-lg transition-all hover:brightness-110"
                    style={{ background: '#7c3aed' }}
                  >
                    Apply <ArrowRight size={14} />
                  </Link>
                ) : (
                  <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-purple-50 text-purple-500 border border-purple-200">
                    Pro required
                  </span>
                )
              ) : (
                <Link href={href} className="text-[13px] font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  Details <ArrowRight size={13} />
                </Link>
              )
            ) : (
              <Link href={href} className="text-[13px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                Learn more <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>

        {/* Row 6: Qualifying scripts (expandable) — only for logged-in users */}
        {is_logged_in && !hasApplied && qualCount > 0 && (
          <div className="mt-3">
            <button
              onClick={(e) => { e.preventDefault(); setExpanded(!expanded) }}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-green-700 hover:text-green-800 transition-colors bg-transparent border-0 cursor-pointer p-0"
            >
              {qualCount} {qualCount === 1 ? 'script qualifies' : 'scripts qualify'}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {qualifying_scripts.map(s => (
                  <div key={s.id} className="flex items-center gap-2 pl-1">
                    <FileText size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[13px] text-gray-700 truncate">{s.title || 'Untitled'}</span>
                    {s.score != null && (
                      <span className="text-[12px] font-bold text-purple-600 shrink-0">
                        {Math.round(s.score)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Zero qualifying — CTA */}
        {is_logged_in && !hasApplied && qualCount === 0 && (
          <p className="text-[12px] text-gray-400 m-0 mt-3">
            None of your scripts match yet.{' '}
            <Link href="/dashboard" className="font-semibold text-purple-600 hover:text-purple-700">Upload a new script</Link>
          </p>
        )}
      </div>
    </div>
  )
}
