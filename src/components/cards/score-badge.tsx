// ScoreBadge — single canonical rendering of a Selznick or community score.
// Anuj 2026-04-29 v0.5 cards kit.

interface Props {
  score: number | null | undefined
  /** 'selznick' = purple gradient (default), 'community' = gold-to-amber, 'neutral' = gray */
  kind?: 'selznick' | 'community' | 'neutral'
  /** xs=32, sm=40, md=48, lg=64 */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Show the kind label above the number (e.g. "Selznick"). */
  showLabel?: boolean
}

const SIZES = {
  xs: { box: 36, num: 12, lab: 6 },
  sm: { box: 44, num: 14, lab: 7 },
  md: { box: 52, num: 17, lab: 7 },
  lg: { box: 68, num: 22, lab: 9 },
}

const KINDS = {
  selznick: { bg: 'linear-gradient(135deg,#7c3aed,#a855f7)', label: 'GEM score' },
  community: { bg: 'linear-gradient(135deg,#d4a017,#f59e0b)', label: 'Community' },
  neutral: { bg: '#f3f3f3', label: 'Score' },
}

export function ScoreBadge({ score, kind = 'selznick', size = 'md', showLabel = false }: Props) {
  const { box, num, lab } = SIZES[size]
  const k = KINDS[kind]
  const value = score == null ? '—' : Math.round(Number(score))
  const isNeutral = kind === 'neutral'
  return (
    <div
      className="shrink-0 rounded-lg flex flex-col items-center justify-center"
      style={{
        background: k.bg,
        color: isNeutral ? '#444' : '#fff',
        width: box, height: box,
        boxShadow: isNeutral ? 'inset 0 0 0 1px #ececec' : undefined,
      }}
    >
      {showLabel && (
        <span style={{ fontSize: lab, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', opacity: 0.9, lineHeight: 1, marginBottom: 1, whiteSpace: 'nowrap' }}>
          {k.label}
        </span>
      )}
      <span style={{ fontSize: num, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
