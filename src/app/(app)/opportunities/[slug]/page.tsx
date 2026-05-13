// /opportunities/[slug] — individual opportunity detail page.
// v4 — vivid redesign: color-coded deal badge, real status pills,
//       qualifying scripts list, strong logged-out CTA.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, FileText, Clock, Target } from 'lucide-react'
import { UploadCTAButton } from '@/components/upload-cta-button'
import { SubscribeCTA } from '@/components/subscribe-cta'

const GENRE_LABELS: Record<string, string> = {
  thriller: 'Thriller', crime: 'Crime', horror: 'Horror', drama: 'Drama',
  comedy: 'Comedy', 'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', romance: 'Romance',
  action: 'Action', family: 'Family', western: 'Western', musical: 'Musical',
}
const BUDGET_LABELS: Record<string, string> = {
  micro: 'Micro', indie: 'Indie', mid: 'Mid', studio: 'Studio', premium: 'Premium', tentpole: 'Tentpole',
}
const FORMAT_LABELS: Record<string, string> = {
  feature: 'Feature', pilot: 'Pilot', limited_series: 'Limited Series', short: 'Short',
}

const STAGE_DISPLAY: Record<string, { label: string; bg: string; text: string; description: string }> = {
  pending:       { label: 'Application Pending', bg: '#ede9fe', text: '#5b21b6', description: 'Your application has been submitted and is awaiting review.' },
  submitted:     { label: 'Application Pending', bg: '#ede9fe', text: '#5b21b6', description: 'Your application has been submitted and is awaiting review.' },
  in_review:     { label: 'In Review',           bg: '#ede9fe', text: '#5b21b6', description: 'Your script is being reviewed. You\'ll hear back soon.' },
  partner_match: { label: 'Partner Match',       bg: '#ede9fe', text: '#5b21b6', description: 'A partner match has been identified for your script.' },
  complete:      { label: 'Reviewed',            bg: '#ede9fe', text: '#5b21b6', description: 'Your application has been reviewed. Check your dashboard for feedback.' },
}

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = svc()
  const { data: opp } = await service
    .from('opportunities')
    .select('title, subtitle, description')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!opp) return { title: 'Opportunity not found — GEM' }
  const desc = opp.subtitle ?? opp.description?.slice(0, 140) ?? ''
  const title = `${opp.title} — GEM`
  return {
    title, description: desc,
    openGraph: { title, description: desc, type: 'article', siteName: 'GEM' },
    twitter: { card: 'summary_large_image', title, description: desc },
  }
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { slug } = await params
  const service = svc()

  const { data: opp } = await service
    .from('opportunities')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!opp) notFound()

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  // User-specific data
  type QScript = { id: string; title: string | null; score: number | null; format: string | null }
  let qualifyingScripts: QScript[] = []
  let reviewStage: string | null = null
  let isPro = false

  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    isPro = profile?.subscription_status === 'active'

    // Get consideration status
    const { data: consideration } = await service
      .from('considerations')
      .select('review_stage')
      .eq('writer_id', user.id)
      .eq('opportunity_id', opp.id)
      .limit(1)
      .single()

    if (consideration?.review_stage && consideration.review_stage !== 'draft') {
      reviewStage = consideration.review_stage
    }

    // Get qualifying scripts
    const { data: userSubs } = await service
      .from('script_submissions')
      .select('id, title, declared_format, hidden_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const visibleSubs = ((userSubs || []) as any[]).filter((s: any) => !s.hidden_at)
    const subIds = visibleSubs.map((s: any) => s.id)

    if (subIds.length > 0) {
      const { data: evals } = await service
        .from('script_evaluations')
        .select('submission_id, weighted_score, evaluation')
        .in('submission_id', subIds)

      // Normalize genre string: lowercase, unify dashes, strip junk
      function normGenre(g: string | null | undefined): string {
        return (g ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
      }

      function collectGenres(...sources: (string | string[] | null | undefined)[]): string[] {
        const set = new Set<string>()
        for (const s of sources) {
          if (!s) continue
          const items = Array.isArray(s) ? s : [s]
          for (const item of items) {
            const n = normGenre(item)
            if (n) set.add(n)
          }
        }
        return Array.from(set)
      }

      for (const sub of visibleSubs) {
        const ev = ((evals || []) as any[]).find((e: any) => e.submission_id === sub.id)
        if (!ev) continue
        const evJson = ev.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        const genres = collectGenres(
          cls.genre_primary as string,
          cls.genre_secondary as string[],
          cls.genre_tags as string[],
        )
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null

        let ok = true
        if (opp.formats?.length > 0 && !opp.formats.includes(sub.declared_format)) ok = false
        if (opp.genres?.length > 0 && genres.length > 0) {
          const oppGenresNorm = opp.genres.map(normGenre)
          const hasOverlap = genres.some((sg: string) =>
            oppGenresNorm.some((og: string) => sg.includes(og) || og.includes(sg))
          )
          if (!hasOverlap) ok = false
        }
        if (opp.budget_tiers?.length > 0 && budget && !opp.budget_tiers.includes(budget)) ok = false
        if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) ok = false

        if (ok) {
          qualifyingScripts.push({
            id: sub.id,
            title: sub.title,
            score: ev.weighted_score,
            format: sub.declared_format,
          })
        }
      }
    }
  }

  const deadline = opp.deadline ? new Date(opp.deadline) : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
  const stageInfo = reviewStage ? STAGE_DISPLAY[reviewStage] : null

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-400 hover:text-gray-700 transition-colors mb-5"
      >
        &larr; All opportunities
      </Link>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e5e7eb' }}>
        <div className="px-6 py-6 sm:px-8 sm:py-8">

          {/* ── Title ── */}
          <h1
            className="text-[28px] sm:text-[32px] font-bold text-gray-900 m-0 mb-1 leading-tight"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {opp.title}
          </h1>

          {/* ── Subtitle ── */}
          {opp.subtitle && (
            <p className="text-[15px] text-gray-500 m-0 mb-2 font-medium leading-snug">
              {opp.subtitle}
            </p>
          )}

          {/* ── Deadline ── */}
          {daysLeft != null && daysLeft > 0 && (
            <div className="flex items-center gap-1.5 mb-5">
              <Clock size={13} className={daysLeft <= 7 ? 'text-red-500' : 'text-gray-400'} />
              <span className={`text-[13px] font-semibold ${daysLeft <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                {daysLeft === 1 ? 'Closes tomorrow' : `${daysLeft} days left`}
              </span>
            </div>
          )}

          {/* ── Description ── */}
          <p className="text-[15px] text-gray-700 leading-[1.7] m-0 mb-6 whitespace-pre-line">
            {opp.description}
          </p>

          {/* ── Score requirement ── */}
          {opp.min_score != null && (
            <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 border border-gray-100 mb-6">
              <Target size={16} className="text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wide m-0">Minimum score</p>
                <p className="text-[16px] font-bold text-gray-900 m-0">{Math.round(opp.min_score)}+</p>
              </div>
            </div>
          )}

          {/* ── Looking for (genres, formats, budget) ── */}
          {((opp.formats?.length > 0) || (opp.genres?.length > 0) || (opp.budget_tiers?.length > 0)) && (
            <div className="mb-6">
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wide m-0 mb-2">Looking for</p>
              <div className="flex flex-wrap gap-2">
                {opp.formats?.map((f: string) => (
                  <span key={f} className="text-[13px] font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                    {FORMAT_LABELS[f] ?? f}
                  </span>
                ))}
                {opp.genres?.map((g: string) => (
                  <span key={g} className="text-[13px] font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {GENRE_LABELS[g] ?? g}
                  </span>
                ))}
                {opp.budget_tiers?.map((b: string) => (
                  <span key={b} className="text-[13px] font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    {BUDGET_LABELS[b] ?? b} budget
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Divider ── */}
          <div className="h-px bg-gray-100 mb-6" />

          {/* ── CTA section ── */}
          {user ? (
            // ── LOGGED IN ──
            stageInfo ? (
              // Has applied — show status
              <div
                className="rounded-xl px-5 py-4"
                style={{ background: stageInfo.bg, border: `1px solid ${stageInfo.bg}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[12px] font-bold px-3 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.6)', color: stageInfo.text }}
                  >
                    {stageInfo.label}
                  </span>
                </div>
                <p className="text-[14px] m-0 mb-3" style={{ color: stageInfo.text }}>
                  {stageInfo.description}
                </p>
                {reviewStage === 'complete' && (
                  <p className="text-[13px] m-0" style={{ color: stageInfo.text }}>
                    You can submit another script for this opportunity.{' '}
                    <Link href={`/opportunities/${opp.slug}/apply`} className="font-bold underline" style={{ color: stageInfo.text }}>
                      Apply again
                    </Link>
                  </p>
                )}
                <Link href="/dashboard" className="text-[13px] font-bold mt-2 inline-block" style={{ color: stageInfo.text }}>
                  View on dashboard &rarr;
                </Link>
              </div>
            ) : qualifyingScripts.length > 0 ? (
              // Has qualifying scripts — show them + apply
              <div>
                <p className="text-[13px] font-bold text-green-700 m-0 mb-3">
                  {qualifyingScripts.length} {qualifyingScripts.length === 1 ? 'script qualifies' : 'scripts qualify'} for this opportunity
                </p>
                <div className="space-y-2 mb-4">
                  {qualifyingScripts.map(s => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-100 px-4 py-2.5">
                      <FileText size={15} className="text-green-600 shrink-0" />
                      <span className="text-[14px] text-gray-800 font-medium truncate flex-1">{s.title || 'Untitled'}</span>
                      {s.score != null && (
                        <span className="text-[13px] font-bold text-purple-600 shrink-0">
                          Score: {Math.round(s.score)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {isPro ? (
                  <Link
                    href={`/opportunities/${opp.slug}/apply`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110"
                    style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}
                  >
                    Apply now <ArrowRight size={16} />
                  </Link>
                ) : (
                  <div>
                    <p className="text-[13px] text-gray-500 m-0 mb-3">
                      Upgrade to Pro to apply and get your script in front of the reviewer.
                    </p>
                    <SubscribeCTA
                      location="opportunity_detail_upgrade"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110 cursor-pointer border-0"
                      style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}
                      label="Upgrade to Pro — $20/mo"
                    />
                  </div>
                )}
              </div>
            ) : (
              // No qualifying scripts
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4">
                <p className="text-[14px] text-gray-600 font-medium m-0 mb-1">
                  None of your scripts match this opportunity yet.
                </p>
                <p className="text-[13px] text-gray-400 m-0">
                  Upload a script that matches the requirements above.{' '}
                  <Link href="/dashboard" className="font-semibold text-purple-600 hover:text-purple-700">
                    Upload a script
                  </Link>
                </p>
              </div>
            )
          ) : (
            // ── NOT LOGGED IN — strong CTA ──
            <div
              className="rounded-xl px-6 py-6"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.03) 65%), #fff',
                border: '1.5px solid rgba(124,58,237,0.25)',
              }}
            >
              <h3
                className="text-[20px] font-bold text-gray-900 m-0 mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Want to apply?
              </h3>
              <p className="text-[14px] text-gray-600 m-0 mb-1 leading-relaxed">
                Upload your script and we&apos;ll evaluate it against the requirements above. If you qualify, you can submit directly.
              </p>
              <p className="text-[13px] text-gray-400 m-0 mb-4">
                Applying to opportunities is a <span className="font-semibold text-purple-600">GEM Pro</span> feature. Your first evaluation is free.
              </p>
              <UploadCTAButton
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:brightness-110 cursor-pointer border-0"
                style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}
              >
                Upload a script <ArrowRight size={16} />
              </UploadCTAButton>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
