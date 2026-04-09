interface OverallTakeProps {
  take: string
  blurred?: boolean
}

export function OverallTake({ take, blurred = false }: OverallTakeProps) {
  return (
    <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-accent)]/30 bg-[var(--gem-accent)]/5">
      <h2 className="text-xs uppercase tracking-widest text-[var(--gem-accent)] mb-3">
        The overall take
      </h2>
      {blurred ? (
        <div className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
          <p className="text-[var(--gem-gray-200)] leading-relaxed">
            {take}
          </p>
        </div>
      ) : (
        <p className="text-[var(--gem-gray-200)] leading-relaxed">
          {take}
        </p>
      )}
    </div>
  )
}
