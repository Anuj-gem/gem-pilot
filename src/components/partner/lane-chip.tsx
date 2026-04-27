// LaneChip — the pre-selected "filter by lane" pill used at the top of the
// producer dashboard. Pulled from `profiles.lane`. Static for v1 — the X
// button is decorative until we have a "browse all matches" view.

import Link from 'next/link'

interface Lane {
  genres?: string[]
  format?: string
  budget_tier?: string
  audience?: string
}

const BUDGET_LABEL: Record<string, string> = {
  micro: 'sub-$1M',
  indie: '$1–15M',
  mid: '$15–50M',
  studio: '$50M+',
  agnostic: 'Any budget',
}

const FORMAT_LABEL: Record<string, string> = {
  feature: 'Feature',
  series: 'Series',
  both: 'Feature or Series',
}

function titleCase(s: string): string {
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function LaneChip({ lane }: { lane: Lane | null | undefined }) {
  if (!lane) return null
  const parts: string[] = []
  if (lane.genres && lane.genres.length > 0) {
    parts.push(lane.genres.map(titleCase).join(', '))
  }
  if (lane.format) {
    parts.push(FORMAT_LABEL[lane.format.toLowerCase()] || titleCase(lane.format))
  }
  if (lane.budget_tier) {
    parts.push(BUDGET_LABEL[lane.budget_tier.toLowerCase()] || titleCase(lane.budget_tier))
  }
  if (lane.audience && lane.audience.trim().length > 0) {
    parts.push(lane.audience.trim())
  }
  if (parts.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="inline-flex items-center gap-2.5 rounded-full px-4 py-2"
        style={{
          background: 'var(--gem-accent)',
          border: '1px solid var(--gem-accent)',
          color: '#fff',
          boxShadow: '0 1px 2px rgba(124,58,237,0.18)',
        }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-bold"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          Your lane
        </span>
        <span className="text-[13px] font-semibold leading-none">
          {parts.join(' · ')}
        </span>
      </span>
      <Link
        href="/partner/settings"
        className="text-[12.5px] text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-200)] transition-colors"
        style={{
          borderBottom: '1px dashed var(--gem-gray-600)',
          paddingBottom: 1,
        }}
      >
        Edit lane
      </Link>
    </div>
  )
}
