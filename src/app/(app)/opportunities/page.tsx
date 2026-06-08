// /opportunities — the single "We back filmmakers the old gatekeepers miss"
// partner page. PUBLIC (no login required). One partnership, one inline apply.
// Apply attaches to a fixed opportunity (slug "partner") kept non-active/
// unpublished so it never surfaces on public listings.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { InlineApply } from '@/components/opportunities/inline-apply'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const revalidate = 0

const PARTNER_SLUG = 'partner'

export const metadata = {
  title: 'We back filmmakers the old gatekeepers miss — GEM',
  description: 'GEM backs a few filmmakers a year — all the way. Apply with a script.',
  openGraph: {
    title: 'We back filmmakers the old gatekeepers miss — GEM',
    description: 'GEM backs a few filmmakers a year — all the way. Apply with a script.',
    type: 'website' as const,
    siteName: 'GEM',
  },
}

type Script = {
  id: string
  title: string
  score: number | null
  posterUrl: string | null
  format: string | null
  genre: string | null
  date: string | null
}

const INK = '#1C1917'
const MUTED = '#57534E'
const FAINT = '#9b958c'
const LINE = '#ece8e1'

function Diamond({ size = 12 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block rotate-45 shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', borderRadius: 1, verticalAlign: 'middle' }}
    />
  )
}

const WAYS: { title: string; body: string }[] = [
  { title: 'Champion your work', body: 'Put our name and our 400K+ audience behind you and the film.' },
  { title: 'Build proof of concept', body: 'Help you make a teaser, short, or vertical — and back that work.' },
  { title: 'Develop & package', body: 'Sharpen the script, and help attach the talent and team that make it real.' },
  { title: 'Help finance it', body: 'Put early money in, and connect you to partners to raise the rest.' },
  { title: 'Help get it distributed', body: 'Work with partners to find distribution and see it through to release.' },
  { title: 'Market it', body: 'Use our reach to get the finished work in front of an audience.' },
]

const STAGES = ['Your script', 'Developed', 'Packaged', 'Backed', 'Seen by 400K+']

const STEPS: { lead: string; rest: string }[] = [
  { lead: 'Every application is read by a human.', rest: 'No fees, no form into a void.' },
  { lead: 'You always hear back — yes or no.', rest: 'We partner with people, not scripts, so we’ll want to meet you.' },
  { lead: 'If it’s a fit, we get to work.', rest: 'If it’s not yet, you still get our honest notes.' },
]

export default async function OpportunitiesPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  const service = svc()

  const { data: opp } = await service
    .from('opportunities')
    .select('id, slug')
    .eq('slug', PARTNER_SLUG)
    .maybeSingle()

  let scripts: Script[] = []
  let pendingScriptIds: string[] = []
  let reviewed: { id: string; outcome: string; tags: string[] }[] = []

  if (user && opp) {
    const { data: subs } = await service
      .from('script_submissions')
      .select('id, title, poster_url, declared_format, created_at, script_evaluations(weighted_score, evaluation)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .is('hidden_at', null)
      .order('created_at', { ascending: false })

    scripts = ((subs || []) as any[]).map((s) => {
      const ev = Array.isArray(s.script_evaluations) ? s.script_evaluations[0] : s.script_evaluations
      const evJson = (ev?.evaluation as Record<string, any>) || {}
      const cls = (evJson.classification as Record<string, any>) || {}
      const fmt = (evJson.format_detection as Record<string, any>) || {}
      const genre = (cls.genre_primary as string) || null
      const format = (cls.format as string) || (fmt.format as string) || s.declared_format || null
      const date = s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
      return { id: s.id, title: s.title, score: ev?.weighted_score ?? null, posterUrl: s.poster_url ?? null, format, genre, date }
    })

    const { data: cons } = await service
      .from('considerations')
      .select('status, consideration_scripts(script_submission_id, outcome, feedback_tags)')
      .eq('writer_id', user.id)
      .eq('opportunity_id', opp.id)

    const reviewedIds = new Set<string>()
    for (const c of (cons || []) as any[]) {
      for (const cs of (c.consideration_scripts || []) as any[]) {
        if (cs.outcome) {
          if (!reviewedIds.has(cs.script_submission_id)) {
            reviewedIds.add(cs.script_submission_id)
            reviewed.push({ id: cs.script_submission_id, outcome: cs.outcome, tags: cs.feedback_tags || [] })
          }
        } else if (c.status === 'pending') {
          pendingScriptIds.push(cs.script_submission_id)
        }
      }
    }
  }

  const fullBleed: React.CSSProperties = {
    width: '100vw',
    position: 'relative',
    left: '50%',
    marginLeft: '-50vw',
  }

  return (
    <div style={{ marginTop: -24, marginBottom: -64 }}>
      {/* ── 1. HERO (full-bleed dark) ── */}
      <div
        style={{
          ...fullBleed,
          background: 'radial-gradient(ellipse at 50% 0%, #2b1a55 0%, #1a1035 55%, #140a28 100%)',
          color: '#fff',
          textAlign: 'center',
          padding: '72px 20px 60px',
        }}
      >
        <div style={{ width: 30, height: 30, transform: 'rotate(45deg)', background: 'linear-gradient(135deg,#c4b5fd,#7c3aed)', borderRadius: 3, margin: '0 auto 26px', boxShadow: '0 0 40px rgba(124,58,237,.6)' }} />
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#b9a9f0', marginBottom: 20 }}>GEM Studio</div>
        <h1 style={{ fontSize: 'clamp(34px, 7vw, 54px)', lineHeight: 1.04, letterSpacing: '-1.5px', fontWeight: 800, margin: '0 auto 18px', maxWidth: 680 }}>
          We back filmmakers the old gatekeepers miss.
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.45, color: 'rgba(255,255,255,.82)', maxWidth: 540, margin: '0 auto 14px' }}>
          Not the ones with the right credits — the ones with the work.
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 28 }}>
          No films released yet — you&apos;d be among the first.
        </p>
        <div className="flex justify-center flex-wrap" style={{ marginBottom: 30 }}>
          {['Free to apply', 'A few backed each year', 'Every application read by a human'].map((f, i, arr) => (
            <span key={f} style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.85)', padding: '0 16px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,.18)' : 'none' }}>{f}</span>
          ))}
        </div>
        <a
          href="#apply"
          className="inline-block no-underline"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontWeight: 800, fontSize: 16, padding: '16px 38px', borderRadius: 13, boxShadow: '0 10px 30px rgba(124,58,237,.45)' }}
        >
          Apply with a script →
        </a>
      </div>

      <div className="mx-auto px-4" style={{ maxWidth: 760, color: INK }}>
        {/* ── 2. FOUNDER ── */}
        <div className="flex gap-5 items-center" style={{ padding: '40px 0', borderBottom: `1px solid ${LINE}` }}>
          <div className="shrink-0 flex items-center justify-center" style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg,#6d8bdc,#3b5bb5)', color: '#fff', fontSize: 30, fontWeight: 700 }}>A</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: '#534AB7', marginBottom: 7 }}>Anuj Kommareddy · Founder</div>
            <p style={{ fontSize: 16.5, lineHeight: 1.5 }}>
              GEM is a small studio that backs a few filmmakers a year — all the way. We help develop and package the
              film, open doors to the partners who can fund and distribute it, and put a <b style={{ fontWeight: 700 }}>400,000-person</b> audience
              behind it. I read every application myself. We take very few, and you always hear back.
            </p>
          </div>
        </div>

        {/* ── 3. WHAT WE DO ── */}
        <div style={{ padding: '42px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: FAINT, marginBottom: 22 }}>What we do when we back you</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {WAYS.map((w) => (
              <div key={w.title} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 20 }}>
                <div style={{ marginBottom: 11 }}><Diamond /></div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{w.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: MUTED }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. PIPELINE ── */}
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: '26px 22px', textAlign: 'center', marginBottom: 42 }}>
          <div className="flex items-center justify-center flex-wrap" style={{ gap: 10, marginBottom: 14 }}>
            {STAGES.map((s, i) => (
              <span key={s} className="flex items-center" style={{ gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: INK, background: '#faf9ff', border: '1px solid #e6e0ff', borderRadius: 10, padding: '9px 15px' }}>{s}</span>
                {i < STAGES.length - 1 && <span style={{ color: '#c9bff0', fontSize: 11, margin: '0 4px' }}>◆</span>}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 13, color: FAINT }}>The path we walk with the filmmakers we back — and the doors we open along the way.</div>
        </div>

        {/* ── 5. AFTER YOU APPLY + APPLY ── */}
        <div id="apply" style={{ paddingBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: FAINT, marginBottom: 22 }}>What happens after you apply</div>
          <div className="flex flex-col" style={{ gap: 16, marginBottom: 26 }}>
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start" style={{ gap: 14 }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, borderRadius: '50%', background: '#F0EDFB', color: '#534AB7', fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                <span style={{ fontSize: 15.5, lineHeight: 1.5 }}><b style={{ fontWeight: 700 }}>{s.lead}</b> {s.rest}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#534AB7', textAlign: 'center', marginBottom: 18 }}>We take very few — but you&apos;ll always hear back.</div>

          <InlineApply
            opportunityId={opp?.id ?? null}
            signedIn={!!user}
            scripts={scripts}
            pendingScriptIds={pendingScriptIds}
            reviewed={reviewed}
          />
        </div>

        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: MUTED, padding: '48px 0 70px' }}>
          Back the next great filmmaker — outside the old gatekeepers.
        </div>
      </div>
    </div>
  )
}
