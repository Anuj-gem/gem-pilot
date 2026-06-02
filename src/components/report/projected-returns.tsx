'use client'

interface Props {
  budgetTotal: number
  revenueTotal: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`
  return `$${n.toLocaleString()}`
}

export function ProjectedReturns({ budgetTotal, revenueTotal }: Props) {
  const returnMultiple = budgetTotal > 0 ? (revenueTotal / budgetTotal) : 0

  return (
    <div>
      <div className="flex items-center gap-5">
        <div>
          <div className="text-[11px] text-gray-600 uppercase tracking-wider mb-0.5">Cost</div>
          <div className="text-xl font-medium text-gray-900">{fmt(budgetTotal)}</div>
        </div>
        <div className="text-lg text-gray-300">→</div>
        <div>
          <div className="text-[11px] text-gray-600 uppercase tracking-wider mb-0.5">Revenue</div>
          <div className="text-xl font-medium" style={{ color: '#085041' }}>{fmt(revenueTotal)}</div>
        </div>
        {returnMultiple > 0 && (
          <>
            <div className="text-lg text-gray-300">→</div>
            <div>
              <div className="text-[11px] text-gray-600 uppercase tracking-wider mb-0.5">Return</div>
              <div className="text-xl font-medium" style={{ color: '#534AB7' }}>{returnMultiple.toFixed(1)}x</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
