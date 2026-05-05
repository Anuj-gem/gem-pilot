// /opportunities — browse open calls. PUBLIC page (no login required).
// Consideration model: writers don't apply per-opportunity. Instead, this
// page shows which of their scripts qualify as an informational signal.
// opportunities-v4 consideration (2026-05-05).

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { type OpportunityData } from '@/components/opportunities/opportunity-card'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const revalidate = 60

export const metadata = {
  title: 'Opportunities — GEM',
  description:
    'Browse active opportunities from producers, lit reps, and financiers looking for new voices.',
}

export default async function OpportunitiesPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  const service = svc()

  // Fetch active opportunities
  const { data: opps } = await service
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const opportunities = (opps || []) as OpportunityData[]

  // Fetch user's completed scripts + qualification matching (only if logged in)
  type QualScript = { id: string; title: string; evaluationId: string }
  const qualByOpp = new Map<string, QualScript[]>()

  if (user) {
    const { data: userSubs } = await service
      .from('script_submissions')
      .select('id, title, declared_format')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const subIds = (userSubs || []).map((s: any) => s.id)

    const evalsBySubmission = new Map<string, { id: string; weighted_score: number | null; genre: string | null; budget: string | null }>()

    if (subIds.length > 0) {
      const { data: evals } = await service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score, evaluation')
        .in('submission_id', subIds)

      for (const ev of (evals || []) as any[]) {
        const evJson = ev.evaluation as Record<string, unknown> | null
        const cls = (evJson?.classification as Record<string, unknown>) || {}
        const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
        const genre = ((cls.genre_primary as string) || (fmt.genre_primary as string) || '').toLowerCase().replace(/[^a-z-]/g, '') || null
        const packaging = (evJson?.packaging as Record<string, unknown>) || {}
        const budgetTier = packaging.budget_tier as Record<string, unknown> | undefined
        const budget = (budgetTier?.tier as string)?.toLowerCase() ?? null
        evalsBySubmission.set(ev.submission_id, { id: ev.id, weighted_score: ev.weighted_score, genre, budget })
      }
    }

    for (const opp of opportunities) {
      const qualifying: QualScript[] = []
      for (const sub of (userSubs || []) as any[]) {
        const ev = evalsBySubmission.get(sub.id)
        if (!ev) continue
        if (opp.formats.length > 0 && !opp.formats.includes(sub.declared_format)) continue
        if (opp.genres.length > 0 && ev.genre && !opp.genres.includes(ev.genre)) continue
        if (opp.budget_tiers.length > 0 && ev.budget && !opp.budget_tiers.includes(ev.budget)) continue
        if (opp.min_score != null && (ev.weighted_score == null || ev.weighted_score < opp.min_score)) continue
        qualifying.push({ id: sub.id, title: sub.title, evaluationId: ev.id })
      }
      if (qualifying.length > 0) qualByOpp.set(opp.id, qualifying)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-1 m-0">Browse</p>
          <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
            Open opportunities
          </h1>
          <p className="text-[13px] text-gray-400 mt-1 m-0">
            {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} currently open
          </p>
        </div>
        {user && (
          <Link
            href="/dashboard"
            className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
          >
            &larr; Dashboard
          </Link>
        )}
      </div>

      {/* Logged-out CTA */}
      {!user && (
        <div
          className="rounded-xl px-5 py-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02) 65%), #fff',
            border: '1.5px solid rgba(124,58,237,0.20)',
          }}
        >
          <div>
            <p className="text-[14px] font-bold text-gray-900 m-0 leading-snug">
              Upload your script to see which opportunities you qualify for
            </p>
            <p className="text-[12.5px] text-gray-500 m-0 mt-1">
              Get a free evaluation and we&apos;ll match you to open calls automatically.
            </p>
          </div>
          <Link
            href="/submit"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: '#7c3aed' }}
          >
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Opportunity list */}
      <div className="flex flex-col gap-3">
        {opportunities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-400">No open opportunities right now. Check back soon.</p>
          </div>
        ) : (
          opportunities.map((opp) => {
            const quals = qualByOpp.get(opp.id) || []
            return (
              <div key={opp.id} className="rounded-xl bg-white border border-gray-200 overflow-hidden">
                <Link href={`/opportunities/${opp.slug ?? opp.id}`} className="block px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14.5px] font-bold text-gray-900 m-0 leading-snug">{opp.title}</h3>
                      {opp.posted_by && (
                        <p className="text-[12px] text-gray-400 m-0 mt-0.5">{opp.posted_by}</p>
                      )}
                      <p className="text-[12.5px] text-gray-500 m-0 mt-1.5 line-clamp-2 leading-[1.5]">
                        {opp.description}
                      </p>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {opp.formats.length > 0 && opp.formats.map(f => (
                          <span key={f} className="text-[10.5px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                        {opp.genres.length > 0 && opp.genres.slice(0, 3).map(g => (
                          <span key={g} className="text-[10.5px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{g}</span>
                        ))}
                        {opp.min_score != null && (
                          <span className="text-[10.5px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                            {opp.min_score}+ score
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 shrink-0 mt-1" />
                  </div>
                </Link>

                {/* Qualifying scripts (logged-in only) */}
                {quals.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-2.5 bg-emerald-50/50">
                    <p className="text-[10.5px] font-bold text-emerald-700 m-0 mb-1.5">
                      {quals.length} qualifying {quals.length === 1 ? 'script' : 'scripts'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quals.map(q => (
                        <Link
                          key={q.id}
                          href={`/report/${q.evaluationId}`}
                          className="text-[11.5px] font-medium text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-lg hover:border-purple-300 hover:text-purple-700 transition-colors truncate max-w-[200px]"
                        >
                          {q.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Consideration CTA for logged-in users */}
      {user && (
        <div className="mt-6 text-center">
          <p className="text-[12.5px] text-gray-400 m-0 mb-2">
            Qualifying scripts are automatically included when you request consideration.
          </p>
          <Link
            href="/consideration/submit"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-purple-600 hover:text-purple-800 transition-colors"
          >
            Request consideration →
          </Link>
        </div>
      )}
    </div>
  )
}
