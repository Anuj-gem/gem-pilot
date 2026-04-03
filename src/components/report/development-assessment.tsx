import type { DevelopmentAssessment as DevelopmentAssessmentType } from '@/types'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface DevelopmentAssessmentProps {
  assessment: DevelopmentAssessmentType
  blurred?: boolean
}

function BlurredText({ children }: { children: React.ReactNode }) {
  return (
    <span className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
      {children}
    </span>
  )
}

export function DevelopmentAssessment({ assessment, blurred = false }: DevelopmentAssessmentProps) {
  return (
    <div className="space-y-6">
      {/* What's Working */}
      <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
        <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400 mb-5">
          <CheckCircle2 size={14} />
          What&apos;s working
        </h2>
        <div className="space-y-5">
          {assessment.working.map((point, i) => (
            <div key={i} className="space-y-1.5">
              <h3 className="text-sm font-medium text-[var(--gem-white)]">
                {blurred ? <BlurredText>{point.point}</BlurredText> : point.point}
              </h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                <span className="text-[var(--gem-gray-300)] font-medium">Evidence: </span>
                {blurred ? <BlurredText>{point.evidence}</BlurredText> : point.evidence}
              </p>
              {blurred ? (
                <div className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
                  <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed">
                    {point.why_it_works}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed">
                  {point.why_it_works}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* What's Hurting */}
      <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
        <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 mb-5">
          <AlertTriangle size={14} />
          What needs work
        </h2>
        <div className="space-y-5">
          {assessment.hurting.map((point, i) => (
            <div key={i} className="space-y-1.5">
              <h3 className="text-sm font-medium text-[var(--gem-white)]">
                {blurred ? <BlurredText>{point.point}</BlurredText> : point.point}
              </h3>
              <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                <span className="text-[var(--gem-gray-300)] font-medium">Evidence: </span>
                {blurred ? <BlurredText>{point.evidence}</BlurredText> : point.evidence}
              </p>
              {blurred ? (
                <div className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
                  <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed italic">
                    {point.suggestion}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed italic">
                  {point.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
