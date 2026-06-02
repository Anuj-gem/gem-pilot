'use client'

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

interface Props {
  budgetTotal: number
  securedAmount: number
  consideringAmount: number
}

export function FundingProgressBar({ budgetTotal, securedAmount, consideringAmount }: Props) {
  if (budgetTotal <= 0) return null

  const totalFunded = securedAmount + consideringAmount
  const securedPct = Math.min(100, Math.round((securedAmount / budgetTotal) * 100))
  const consideringPct = Math.min(100 - securedPct, Math.round((consideringAmount / budgetTotal) * 100))

  return (
    <div className="mb-5">
      <div className="flex justify-between text-[12px] mb-1.5" style={{ color: '#78716C' }}>
        <span>Funding progress</span>
        <span>{fmt(totalFunded)} of {fmt(budgetTotal)}</span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: '#f0edf9', position: 'relative' }}
      >
        {securedPct > 0 && (
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(securedPct, 1)}%`,
              background: '#0F6E56',
              position: 'absolute',
              left: 0,
              top: 0,
            }}
          />
        )}
        {consideringPct > 0 && (
          <div
            className="h-full"
            style={{
              width: `${consideringPct}%`,
              background: '#534AB7',
              opacity: 0.4,
              position: 'absolute',
              left: `${securedPct}%`,
              top: 0,
            }}
          />
        )}
      </div>
      <div className="flex gap-4 mt-1.5 text-[11px]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#0F6E56' }} />
          <span style={{ color: '#78716C' }}>Secured</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#534AB7', opacity: 0.5 }} />
          <span style={{ color: '#78716C' }}>Considering</span>
        </span>
      </div>
    </div>
  )
}
