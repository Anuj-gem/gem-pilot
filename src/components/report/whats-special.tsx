import type { WhatsSpecial } from '@/types'
import { CheckCircle2, ChevronDown } from 'lucide-react'

interface Props {
  data: WhatsSpecial
  blurred?: boolean
}

function BlurWrap({ blurred, children }: { blurred: boolean; children: React.ReactNode }) {
  if (!blurred) return <>{children}</>
  return (
    <div className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
      {children}
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const label = source === 'production' ? 'Production' : source === 'both' ? 'Script + Production' : 'Script'
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-400/70">
      {label}
    </span>
  )
}

export function WhatsSpecialSection({ data, blurred = false }: Props) {
  return (
    <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
      <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400 mb-4">
        <CheckCircle2 size={14} />
        What makes this special
      </h2>

      {/* Headline */}
      <BlurWrap blurred={blurred}>
        <p className="text-sm text-[var(--gem-gray-200)] leading-relaxed mb-5">
          {data.headline}
        </p>
      </BlurWrap>

      {/* Strengths list */}
      <div className="space-y-3">
        {data.strengths.map((s, i) => (
          <details key={i} className="group">
            <summary className="cursor-pointer list-none flex items-start gap-2">
              <ChevronDown size={14} className="text-[var(--gem-gray-500)] mt-0.5 shrink-0 group-open:rotate-180 transition-transform" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--gem-white)]">
                    {blurred ? (
                      <span className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
                        {s.dimension_or_area}
                      </span>
                    ) : s.dimension_or_area}
                  </span>
                  {!blurred && <SourceBadge source={s.source} />}
                </div>
              </div>
            </summary>
            <BlurWrap blurred={blurred}>
              <div className="ml-6 mt-2 space-y-1.5">
                <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed">
                  {s.what_it_means}
                </p>
                <p className="text-xs text-[var(--gem-gray-500)] leading-relaxed">
                  {s.evidence}
                </p>
              </div>
            </BlurWrap>
          </details>
        ))}
      </div>
    </div>
  )
}
