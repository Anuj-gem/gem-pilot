// /opportunities — the single "Partner with GEM" page. PUBLIC (no login required).
// Replaces the old multi-opportunity listing. One partnership, one inline apply.
// The apply attaches to a fixed opportunity (slug "partner") that is kept
// non-active/unpublished so it never surfaces on any public listing.

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
  title: 'Make it with us — GEM',
  description: 'GEM partners with a small number of filmmakers to get great work made. Apply with a script.',
  openGraph: {
    title: 'Make it with us — GEM',
    description: 'GEM partners with a small number of filmmakers to get great work made. Apply with a script.',
    type: 'website' as const,
    siteName: 'GEM',
  },
}

type Script = { id: string; title: string; score: number | null }

const INK = '#1C1917'
const MUTED = '#57534E'
const FAINT = '#9b958c'
const LINE = '#ece8e1'

function Diamond({ size = 11, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block rotate-45 shrink-0"
      style={{
        width: size,
        height: size,
        background: dark ? 'linear-gradient(135deg,#c4b5fd,#a855f7)' : 'linear-gradient(135deg,#a78bfa,#7c3aed)',
        borderRadius: 1,
        verticalAlign: 'middle',
      }}
    />
  )
}

function Rule() {
  return <div style={{ height: 1, background: LINE, margin: '40px 0' }} />
}

const WAYS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Put it in front of our audience',
    body: (
      <>
        We&apos;ll showcase the work — and the people behind it — to our community of{' '}
        <span style={{ color: '#534AB7', fontWeight: 600 }}>400K+ followers</span>, and growing.
      </>
    ),
  },
  {
    title: 'Help you prove it out',
    body: <>When we believe in something, we&apos;ll help you make and test proof of concept — before anyone&apos;s spent real money.</>,
  },
  {
    title: 'Help fund it',
    body: <>We&apos;re willing to put money in ourselves, and help you raise the rest of what production needs.</>,
  },
  {
    title: 'Produce it with you',
    body: <>When we really love something, we&apos;ll come on as a producer and help get it made.</>,
  },
]

const EXCITES: { lead: string; rest: string }[] = [
  { lead: 'Proof of concept.', rest: 'Something that already shows it works.' },
  { lead: 'Many possible pathways.', rest: 'A story that could take more than one shape or format.' },
  { lead: 'A big win on a small budget.', rest: 'The kind of breakout we can scale into something bigger.' },
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
      .select('id, title, status, hidden_at, script_evaluations(weighted_score)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .is('hidden_at', null)
      .order('created_at', { ascending: false })

    scripts = ((subs || []) as any[]).map((s) => {
      const ev = Array.isArray(s.script_evaluations) ? s.script_evaluations[0] : s.script_evaluations
      return { id: s.id, title: s.title, score: ev?.weighted_score ?? null }
    })

    // All of the writer's applications to this opportunity, with per-script
    // review state. A script is "reviewed" once its row has an outcome;
    // otherwise it's "pending" (in an open application).
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

  return (
    <div
      style={{
        background: '#f7f5f1',
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        left: '50%',
        marginLeft: '-50vw',
        marginTop: '-24px',
        paddingTop: '40px',
        marginBottom: '-64px',
        paddingBottom: '80px',
        color: INK,
      }}
    >
      <div className="mx-auto px-4" style={{ maxWidth: 720 }}>
        {/* Hero */}
        <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#534AB7', marginBottom: 18 }}>
          <Diamond /> GEM Studio
        </div>
        <h1 style={{ fontSize: 42, lineHeight: 1.05, letterSpacing: '-1.5px', fontWeight: 800, marginBottom: 16 }}>
          Make it with us.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.5, color: MUTED, maxWidth: 610 }}>
          We take open applications from filmmakers we&apos;d want to back. Fall for a project and we&apos;ll get
          behind it — however it needs us.{' '}
          <b style={{ color: INK, fontWeight: 700 }}>
            This isn&apos;t a contest or coverage. It&apos;s a partnership — and we&apos;re very selective about who we offer it to.
          </b>
        </p>

        <Rule />

        {/* Ways we can help */}
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: FAINT, marginBottom: 20 }}>
          Ways we can help
        </div>
        {WAYS.map((w, i) => (
          <div
            key={w.title}
            className="flex gap-3.5"
            style={{ padding: '18px 0', borderBottom: i < WAYS.length - 1 ? `1px solid ${LINE}` : 'none' }}
          >
            <span style={{ marginTop: 7 }}><Diamond /></span>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 5 }}>{w.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: MUTED }}>{w.body}</p>
            </div>
          </div>
        ))}

        <Rule />

        {/* What gets our attention */}
        <div style={{ background: '#fff', border: '1px solid #e6e0ff', borderRadius: 16, padding: '24px 26px' }}>
          <h2 className="flex items-center gap-2" style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>
            <Diamond /> What gets our attention
          </h2>
          <div>
            {EXCITES.map((e) => (
              <div key={e.lead} className="flex gap-3" style={{ fontSize: 15, lineHeight: 1.55, color: MUTED, padding: '7px 0' }}>
                <span style={{ marginTop: 6 }}><Diamond /></span>
                <span>
                  <b style={{ color: INK, fontWeight: 700 }}>{e.lead}</b> {e.rest}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Rule />

        {/* Apply */}
        <InlineApply
          opportunityId={opp?.id ?? null}
          signedIn={!!user}
          scripts={scripts}
          pendingScriptIds={pendingScriptIds}
          reviewed={reviewed}
        />
      </div>
    </div>
  )
}
