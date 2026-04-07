import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { ReportHeader } from '@/components/report/report-header'
import { ScoreCard } from '@/components/report/score-card'
import { WhatsSpecialSection } from '@/components/report/whats-special'
import { WhatsHoldingItBackSection } from '@/components/report/whats-holding-it-back'
import { ProductionReality } from '@/components/report/production-reality'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { normalizeEvaluation, type ScriptEvaluation, type ScriptSubmission, type GEMEvaluation, type Tier } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

type SampleRow = ScriptSubmission & {
  sample_slug: string | null
  sample_author: string | null
  sample_year: number | null
  sample_genre: string | null
  sample_type: string | null
  is_sample: boolean | null
  script_evaluations: ScriptEvaluation[] | null
}

async function loadSample(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('script_submissions')
    .select(`
      id, title, sample_slug, sample_author, sample_year, sample_genre, sample_type, is_sample, created_at,
      script_evaluations ( id, weighted_score, tier, evaluation, created_at )
    `)
    .eq('is_sample', true)
    .eq('sample_slug', slug)
    .maybeSingle()

  if (error || !data) return null
  const row = data as unknown as SampleRow
  const ev = row.script_evaluations?.[0]
  if (!ev) return null
  return { row, ev }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const loaded = await loadSample(slug)
  if (!loaded) {
    return { title: 'Sample not found' }
  }
  const { row, ev } = loaded
  const title = `${row.title} — GEM Sample Report (Score: ${Math.round(ev.weighted_score)})`
  const description = `See how GEM scored ${row.title}${row.sample_author ? ` by ${row.sample_author}` : ''} — full producer-grade report, free to read.`
  return {
    title,
    description,
    alternates: { canonical: `https://www.gem.studio/sample/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://www.gem.studio/sample/${slug}`,
      type: 'article',
    },
  }
}

export default async function SampleReportPage({ params }: PageProps) {
  const { slug } = await params
  const loaded = await loadSample(slug)
  if (!loaded) notFound()

  const { row, ev } = loaded
  const rawEval = ev.evaluation as GEMEvaluation
  const { classification, whatsSpecial, whatsHoldingItBack } = normalizeEvaluation(rawEval)

  const authorDisplay = row.sample_author ?? 'Unknown'
  const createdAt = row.sample_year
    ? `${row.sample_year}-01-01T00:00:00Z`
    : ev.created_at

  return (
    <>
      <Nav />
      <ReportAnalytics evaluationId={ev.id} isBlurred={false} />

      {/* Sample banner */}
      <div className="border-b border-violet-200 bg-violet-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-violet-900">
            <Sparkles size={14} className="shrink-0" />
            <span>
              <span className="font-semibold">GEM Sample Report</span> — produced screenplay, scored by GEM for reference.
            </span>
          </div>
          <Link
            href="/sample"
            className="inline-flex items-center gap-1.5 text-xs text-violet-700 hover:text-violet-900 font-medium"
          >
            <ArrowLeft size={12} /> All samples
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <ReportHeader
          title={row.title}
          author={authorDisplay}
          tier={ev.tier as Tier}
          weightedScore={ev.weighted_score}
          format={row.sample_type ?? classification.format}
          genre={row.sample_genre ?? classification.genre_primary}
          genreTags={classification.genre_tags}
          tone={classification.tone}
          createdAt={createdAt}
          isOwner={false}
        />

        <WhatsSpecialSection data={whatsSpecial} blurred={false} />
        <WhatsHoldingItBackSection data={whatsHoldingItBack} blurred={false} />
        <ScoreCard scores={rawEval.scores} weightedScore={ev.weighted_score} blurred={false} />
        <ProductionReality production={rawEval.production_reality} blurred={false} />

        {/* CTA footer */}
        <div className="mt-8 p-6 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]/50 text-center">
          <h3 className="text-lg font-bold mb-1.5 font-[family-name:var(--font-display)]">
            Want this kind of report on your own script?
          </h3>
          <p className="text-sm text-[var(--gem-gray-400)] mb-4 max-w-md mx-auto">
            GEM scores your screenplay with the same engine in under a minute. First eval is free — no credit card.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
          >
            Score your screenplay
          </Link>
          <div className="mt-3">
            <Link href="/sample" className="text-xs text-[var(--gem-accent)] hover:underline">
              ← Browse more sample reports
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
