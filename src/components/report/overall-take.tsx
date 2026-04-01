interface OverallTakeProps {
  take: string
}

export function OverallTake({ take }: OverallTakeProps) {
  return (
    <div className="p-6 rounded-xl border border-[var(--gem-accent)]/30 bg-[var(--gem-accent)]/5">
      <h2 className="text-xs uppercase tracking-widest text-[var(--gem-accent)] mb-3">
        The overall take
      </h2>
      <p className="text-[var(--gem-gray-200)] leading-relaxed">
        {take}
      </p>
    </div>
  )
}
