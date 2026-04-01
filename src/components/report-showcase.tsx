'use client'

import { useState, useEffect } from 'react'
import { SAMPLE_GOT_REPORT, SHOWCASE_DIMENSIONS } from '@/data/sample-reports'
import { TIER_META } from '@/types'
import { ScoreRing } from '@/components/ui/score-ring'
import { ArrowRight, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const report = SAMPLE_GOT_REPORT
const tier = TIER_META[report.evaluation.tier]

type Tab = 'scores' | 'working' | 'take'

export function ReportShowcase() {
  const [activeTab, setActiveTab] = useState<Tab>('scores')
  const [animatedScore, setAnimatedScore] = useState(0)

  // Animate score ring on mount
  useEffect(() => {
    const target = report.evaluation.weighted_score
    let current = 0
    const step = target / 40
    const interval = setInterval(() => {
      current += step
      if (current >= target) {
        current = target
        clearInterval(interval)
      }
      setAnimatedScore(Math.round(current))
    }, 25)
    return () => clearInterval(interval)
  }, [])

  // Auto-cycle tabs
  useEffect(() => {
    const tabs: Tab[] = ['scores', 'working', 'take']
    const interval = setInterval(() => {
      setActiveTab(prev => {
        const idx = tabs.indexOf(prev)
        return tabs[(idx + 1) % tabs.length]
      })
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-2xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] overflow-hidden">
      {/* Header: title + score */}
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[var(--gem-gray-800)]">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--gem-gray-500)] mb-1.5">
            Sample evaluation
          </p>
          <h3 className="text-lg sm:text-xl font-bold text-white truncate">
            {report.title}
          </h3>
          <p className="text-xs text-[var(--gem-gray-400)] mt-0.5">
            {report.author} · {report.evaluation.format_detection.format}
          </p>
          <span
            className={`inline-flex items-center mt-3 px-3 py-1 rounded border text-xs font-medium uppercase tracking-widest ${tier.bgClass} ${tier.colorClass}`}
          >
            {tier.label}
          </span>
        </div>
        <div className="shrink-0">
          <ScoreRing score={animatedScore} size={80} strokeWidth={4} label="GEM" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[var(--gem-gray-800)]">
        {([
          ['scores', 'Scores'],
          ['working', 'What\'s Working'],
          ['take', 'Overall Take'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === key
                ? 'text-white border-b-2 border-[var(--gem-accent)] -mb-px'
                : 'text-[var(--gem-gray-500)] hover:text-[var(--gem-gray-300)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5 sm:p-6 min-h-[200px]">
        {activeTab === 'scores' && (
          <div className="space-y-3">
            {SHOWCASE_DIMENSIONS.map(dim => (
              <div key={dim.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--gem-gray-300)]">{dim.label}</span>
                  <span className="text-xs font-bold text-white">{dim.score}/10</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--gem-gray-700)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(dim.score / 10) * 100}%`, backgroundColor: dim.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'working' && (
          <div className="space-y-4">
            {report.evaluation.development_assessment.working.slice(0, 2).map((point, i) => (
              <div key={i} className="flex gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{point.point}</p>
                  <p className="text-xs text-[var(--gem-gray-400)] mt-1 leading-relaxed line-clamp-2">
                    {point.why_it_works}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex gap-2.5">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">
                  {report.evaluation.development_assessment.hurting[0].point}
                </p>
                <p className="text-xs text-[var(--gem-gray-400)] mt-1 leading-relaxed line-clamp-2">
                  {report.evaluation.development_assessment.hurting[0].suggestion}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'take' && (
          <div>
            <p className="text-sm text-[var(--gem-gray-200)] leading-relaxed line-clamp-6">
              {report.evaluation.development_assessment.overall_take}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {[
                report.evaluation.format_detection.genre_primary,
                ...report.evaluation.format_detection.genre_tags,
              ].map(tag => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] text-[var(--gem-gray-400)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6">
        <Link
          href="/signup"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
        >
          Get your script evaluated
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
