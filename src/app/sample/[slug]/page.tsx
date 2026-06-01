// Sample report page — shows the full real-report layout (Pitch + Details) for
// a produced screenplay scored by GEM. Details tab is visible here even though
// on real writer reports it's private — a banner at the top of the Details tab
// makes that clear so samples can't mislead.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Sparkles, ArrowLeft, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { ReportTabs } from '@/components/report/report-tabs'
import {
  DetailsView,
  SectionHeader,
  LeadCharacterCard,
} from '@/components/report/details-view'
import { normalizeEvaluation, type ScriptEvaluation, type ScriptSubmission, type GEMEvaluation } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface V4Extras {
  positioning_hook?: string
  lead_characters?: {
    name: string
    role_type: string
    demographics: string
    hook: string
    why_actor_wants_this: string
  }[]
  considerations?: { area: string; detail: string; source?: string }[]
}

type SampleRow = ScriptSubmission & {
  sample_slug: string | null
  sample_author: string | null
  sample_year: number | null
  sample_genre: string | null
  sample_type: string | null
  is_sample: boolean | null
  script_evaluations: ScriptEvaluation | ScriptEvaluation[] | null
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
  const evRaw = row.script_evaluations
  const ev = Array.isArray(evRaw) ? evRaw[0] : evRaw
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
  const title = `${row.title} — GEM Sample Report`
  const description = `${row.title}${row.sample_author ? ` by ${row.sample_author}` : ''} scored ${Math.round(ev.weighted_score)}/100 on GEM — the full producer report, free to read.`
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
  const report = ev.evaluation as GEMEvaluation & V4Extras
  const { classification, whatsSpecial } = normalizeEvaluation(report)

  const positioningHook = report.positioning_hook ?? ''
  const leadCharacters = report.lead_characters ?? []
  const considerations = report.considerations ?? []
  const production = report.production_reality
  const scores = report.scores ?? {}
  const allStrengths = whatsSpecial.strengths ?? []

  const authorDisplay = row.sample_author ?? 'Unknown'

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
              <span className="font-semibold">GEM Sample Report</span> — produced screenplay, scored for reference.
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24 space-y-8">
        {/* Title + meta */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--gem-white)] tracking-tight leading-tight mb-3">
            {row.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--gem-gray-400)]">
            <span>by {authorDisplay}</span>
            {row.sample_year && (
              <>
                <span className="text-[var(--gem-gray-500)]">·</span>
                <span>{row.sample_year}</span>
              </>
            )}
            <span className="text-[var(--gem-gray-500)]">·</span>
            <span>{row.sample_type ?? classification.format}</span>
            {(row.sample_genre ?? classification.genre_primary) && (
              <>
                <span className="text-[var(--gem-gray-500)]">·</span>
                <span>{row.sample_genre ?? classification.genre_primary}</span>
              </>
            )}
          </div>
        </div>

        {/* Positioning hook */}
        {positioningHook && (
          <div
            className="relative border border-[var(--gem-gray-700)] rounded-2xl p-7 sm:p-8"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent 60%)' }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-5 bottom-5 rounded-r"
              style={{ width: 3, background: 'var(--gem-gold)' }}
            />
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)] mb-3">
              The Pitch
            </div>
            <p className="text-xl sm:text-[22px] text-[var(--gem-white)] leading-snug font-medium">
              {positioningHook}
            </p>
          </div>
        )}

        <ReportTabs publicPageUrl={`/sample/${slug}`}>
          {/* Project tab */}
          <>
            <section className="mb-12">
              <SectionHeader label="What Makes This Special" />
              {whatsSpecial.headline && (
                <p className="text-base sm:text-lg text-[var(--gem-gray-200)] leading-relaxed mb-6">
                  {whatsSpecial.headline}
                </p>
              )}
              <div className="space-y-3">
                {allStrengths.map((s, i) => (
                  <div
                    key={i}
                    className="border border-[var(--gem-gray-700)] rounded-xl p-5 bg-white"
                  >
                    <p className="text-[15px] font-semibold text-[var(--gem-white)] mb-2">
                      {s.dimension_or_area}
                    </p>
                    <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed">
                      {s.what_it_means}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <SectionHeader label="Lead Characters" />
              <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
                The parts inside this script and why an actor would chase them.
              </p>
              {leadCharacters.length === 0 ? (
                <p className="text-sm text-[var(--gem-gray-500)] italic">
                  No lead character breakdown available for this report.
                </p>
              ) : (
                <div className="space-y-3">
                  {leadCharacters.map((c, i) => (
                    <LeadCharacterCard key={i} c={c} />
                  ))}
                </div>
              )}
            </section>
          </>
          {/* Analysis tab */}
          <>
            {/* Sample-specific disclosure */}
            <div
              className="flex items-start gap-2 text-[13px] text-amber-900 mb-6 p-3.5 rounded-lg border border-amber-300 bg-amber-50 leading-snug"
            >
              <Eye size={14} className="shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold">Normally private.</strong>{' '}
                On real writer reports, the Details tab is only visible to the writer who uploaded the script. We&apos;re showing it here so you can see what the full report looks like.
              </span>
            </div>

            <DetailsView
              scores={scores}
              production={production}
              considerations={considerations}
              overallScore={ev.weighted_score ?? null}
              showScores
              locked={false}
              showPrivacyNote={false}
            />
          </>
        </ReportTabs>

        {/* CTA footer */}
        <div className="mt-8 p-6 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]/50 text-center">
          <h3 className="text-lg font-bold mb-1.5 font-[family-name:var(--font-display)]">
            Want this kind of report on your own script?
          </h3>
          <p className="text-sm text-[var(--gem-gray-400)] mb-4 max-w-md mx-auto">
            Upload your screenplay. GEM reads it with the same engine. First report free — no credit card.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors glow-accent"
          >
            Get Started — Free
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
