'use client'

import { useState, useEffect, useCallback } from 'react'
import { SAMPLE_GOT_REPORT, SHOWCASE_DIMENSIONS } from '@/data/sample-reports'
import { TIER_META, type Tier, normalizeEvaluation } from '@/types'
import { ScoreRing } from '@/components/ui/score-ring'
import { ArrowRight, CheckCircle2, AlertTriangle, Users, MapPin, Clapperboard, Tv } from 'lucide-react'
import Link from 'next/link'

const report = SAMPLE_GOT_REPORT
const tier = TIER_META[report.tier as Tier]
const prod = report.evaluation.production_reality
const { whatsSpecial, whatsHoldingItBack } = normalizeEvaluation(report.evaluation)

type Tab = 'scores' | 'notes' | 'production'
const TABS: { key: Tab; label: string }[] = [
  { key: 'scores', label: 'Score & Tier' },
  { key: 'notes', label: 'Dev Notes' },
  { key: 'production', label: 'Production' },
]

export function ReportShowcase() {
  const [activeTab, setActiveTab] = useState<Tab>('scores')
  const [animatedScore, setAnimatedScore] = useState(0)

  // Animate score ring on mount
  useEffect(() => {
    const target = report.weighted_score
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

  // Auto-cycle tabs, reset timer on manual click
  const [cycleKey, setCycleKey] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(prev => {
        const idx = TABS.findIndex(t => t.key === prev)
        return TABS[(idx + 1) % TABS.length].key
      })
    }, 6000)
    return () => clearInterval(interval)
  }, [cycleKey])

  const handleTabClick = useCallback((key: Tab) => {
    setActiveTab(key)
    setCycleKey(k => k + 1) // restart auto-cycle timer
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
            {report.author} · {report.evaluation.classification?.format ?? report.evaluation.format_detection?.format}
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
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabClick(key)}
            className={`flex-1 px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-medium transition-colors ${
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
      <div className="p-5 sm:p-6 min-h-[220px]">

        {/* ─── Score & Tier ──────────────────────────── */}
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
            <p className="text-[10px] text-[var(--gem-gray-500)] pt-2">
              Weighted by what matters for getting made — audience appeal and character strength count most.
            </p>
          </div>
        )}

        {/* ─── Development Notes ─────────────────────── */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {whatsSpecial.strengths.slice(0, 2).map((s, i) => (
              <div key={i} className="flex gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{s.dimension_or_area}</p>
                  <p className="text-xs text-[var(--gem-gray-400)] mt-1 leading-relaxed line-clamp-2">
                    {s.what_it_means}
                  </p>
                </div>
              </div>
            ))}
            {whatsHoldingItBack.themes.length > 0 && (
              <div className="flex gap-2.5">
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {whatsHoldingItBack.themes[0].theme}
                  </p>
                  <p className="text-xs text-[var(--gem-gray-400)] mt-1 leading-relaxed line-clamp-2">
                    {whatsHoldingItBack.themes[0].risk}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Production Reality Check ──────────────── */}
        {activeTab === 'production' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-medium text-[var(--gem-gray-200)]">
                <Users size={12} className="text-[var(--gem-gray-400)]" />
                Cast
              </h4>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                {prod.cast.speaking_roles} speaking roles, {prod.cast.leads} leads.
                Name talent: <span className="text-amber-400">required</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-medium text-[var(--gem-gray-200)]">
                <MapPin size={12} className="text-[var(--gem-gray-400)]" />
                Locations
              </h4>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                {prod.locations.distinct_count} distinct. {prod.locations.interior_exterior_mix}.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-medium text-[var(--gem-gray-200)]">
                <Clapperboard size={12} className="text-[var(--gem-gray-400)]" />
                Technical
              </h4>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed line-clamp-3">
                {prod.technical.vfx_requirements}
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-medium text-[var(--gem-gray-200)]">
                <Tv size={12} className="text-[var(--gem-gray-400)]" />
                Platform Fit
              </h4>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed line-clamp-3">
                {prod.platform_fit.recommended_lane}. {prod.platform_fit.content_level}.
              </p>
            </div>
            <div className="col-span-2 flex flex-wrap gap-1.5 pt-1">
              {prod.locations.expensive_flags.map(flag => (
                <span
                  key={flag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/30 border border-amber-800/40 text-amber-400"
                >
                  {flag}
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
