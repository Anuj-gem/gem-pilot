// /collaborations — shows scripts the user collaborates on + people they work with.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

function fmtDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function CollaborationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = svc()

  // ── Fetch user profile + email ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, headline')
    .eq('id', user.id)
    .single()
  const userEmail = user.email ?? ''

  // ── SECTION 1: Scripts you collaborate on ──
  // Find collaborator rows where this user is the collaborator (by id or email)
  const { data: asCollaboratorRows } = await service
    .from('script_collaborators')
    .select('id, submission_id, role, role_other, status, created_at, collaborator_id, collaborator_email')
    .or(`collaborator_id.eq.${user.id},collaborator_email.eq.${userEmail}`)

  const collabRows = (asCollaboratorRows || []) as {
    id: string; submission_id: string; role: string | null; role_other: string | null
    status: string | null; created_at: string; collaborator_id: string | null; collaborator_email: string | null
  }[]

  const collabSubIds = [...new Set(collabRows.map(r => r.submission_id))]
  const collabRoleBySubId = new Map<string, string>()
  for (const r of collabRows) {
    collabRoleBySubId.set(r.submission_id, r.role_other || r.role || 'Collaborator')
  }

  type SubRow = {
    id: string; title: string; declared_format: string | null; status: string
    created_at: string; heat_score: number | null; poster_url: string | null; user_id: string
  }
  let collabSubs: SubRow[] = []

  type EvalRow = {
    id: string; submission_id: string; evaluation: Record<string, unknown> | null
  }
  const evalBySubId = new Map<string, { evalId: string; weighted_score: number | null; format: string | null; genres: string[] }>()

  if (collabSubIds.length > 0) {
    const { data: subs } = await service
      .from('script_submissions')
      .select('id, title, declared_format, status, created_at, heat_score, poster_url, user_id')
      .in('id', collabSubIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
    collabSubs = (subs || []) as SubRow[]

    const completedIds = collabSubs.map(s => s.id)
    if (completedIds.length > 0) {
      const { data: evals } = await service
        .from('script_evaluations')
        .select('id, submission_id, evaluation')
        .in('submission_id', completedIds)
      for (const e of (evals || []) as EvalRow[]) {
        const ev = e.evaluation
        const ws = (ev?.weighted_score as number) ?? null
        const fmt = (ev?.format as string) ?? null
        const genres = (ev?.genres as string[]) ?? []
        evalBySubId.set(e.submission_id, { evalId: e.id, weighted_score: ws, format: fmt, genres })
      }
    }
  }

  // ── SECTION 2: People you collaborate with ──
  // 1) People who collaborate on YOUR scripts (you invited them)
  const { data: mySubmissions } = await supabase
    .from('script_submissions')
    .select('id, title')
    .eq('user_id', user.id)
  const mySubIds = ((mySubmissions || []) as { id: string; title: string }[]).map(s => s.id)
  const mySubTitleById = new Map<string, string>()
  for (const s of (mySubmissions || []) as { id: string; title: string }[]) {
    mySubTitleById.set(s.id, s.title)
  }

  let invitedCollabRows: typeof collabRows = []
  const mySubEvalIdMap = new Map<string, string>()
  if (mySubIds.length > 0) {
    const { data: invRows } = await service
      .from('script_collaborators')
      .select('id, submission_id, role, role_other, status, created_at, collaborator_id, collaborator_email')
      .in('submission_id', mySubIds)
    invitedCollabRows = (invRows || []) as typeof collabRows

    // Fetch eval IDs for the user's own scripts so People section links work
    const { data: myEvals } = await service
      .from('script_evaluations')
      .select('id, submission_id')
      .in('submission_id', mySubIds)
    for (const e of (myEvals || []) as { id: string; submission_id: string }[]) {
      mySubEvalIdMap.set(e.submission_id, e.id)
    }
  }

  // 2) People whose scripts you collaborate on (from collabRows, need to look up the owner)
  const ownerIds = [...new Set(collabSubs.map(s => s.user_id).filter(id => id !== user.id))]

  // Collect all unique person identifiers
  type PersonInfo = {
    id: string | null
    email: string | null
    name: string | null
    avatar_url: string | null
    headline: string | null
    sharedScripts: { id: string; title: string; evalId: string | null }[]
  }
  const personMap = new Map<string, PersonInfo>() // keyed by id or email

  // Add collaborators on your scripts
  for (const r of invitedCollabRows) {
    const key = r.collaborator_id || r.collaborator_email || ''
    if (!key || key === user.id || key === userEmail) continue
    if (!personMap.has(key)) {
      personMap.set(key, { id: r.collaborator_id, email: r.collaborator_email, name: null, avatar_url: null, headline: null, sharedScripts: [] })
    }
    const title = mySubTitleById.get(r.submission_id)
    if (title) {
      const p = personMap.get(key)!
      if (!p.sharedScripts.some(s => s.id === r.submission_id)) {
        p.sharedScripts.push({ id: r.submission_id, title, evalId: mySubEvalIdMap.get(r.submission_id) || null })
      }
    }
  }

  // Add owners of scripts you collaborate on
  for (const s of collabSubs) {
    if (s.user_id === user.id) continue
    const key = s.user_id
    if (!personMap.has(key)) {
      personMap.set(key, { id: s.user_id, email: null, name: null, avatar_url: null, headline: null, sharedScripts: [] })
    }
    const p = personMap.get(key)!
    if (!p.sharedScripts.some(x => x.id === s.id)) {
      p.sharedScripts.push({ id: s.id, title: s.title, evalId: evalBySubId.get(s.id)?.evalId || null })
    }
  }

  // Fetch profiles for all known person IDs
  const profileIds = [...personMap.values()].map(p => p.id).filter(Boolean) as string[]
  if (profileIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, avatar_url, headline')
      .in('id', profileIds)
    for (const pr of (profiles || []) as { id: string; full_name: string | null; avatar_url: string | null; headline: string | null }[]) {
      // Find person entries with this id
      for (const [key, person] of personMap) {
        if (person.id === pr.id) {
          person.name = pr.full_name
          person.avatar_url = pr.avatar_url
          person.headline = pr.headline
        }
      }
    }
  }

  const people = [...personMap.values()]

  // ── RENDER ──
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 28 }}>
        Collaborations
      </h1>

      {/* ── Section 1: Scripts ── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{
          fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const,
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', marginBottom: 14
        }}>
          Scripts
        </h2>

        {collabSubs.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 4,
            padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13
          }}>
            No collaborations yet. When someone adds you to a script, it will appear here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {collabSubs.map(s => {
              const ev = evalBySubId.get(s.id)
              const role = collabRoleBySubId.get(s.id) || 'Collaborator'
              const score = ev?.weighted_score
              const meta = [ev?.format || s.declared_format, ...(ev?.genres || [])].filter(Boolean).join(' · ')

              return (
                <Link
                  key={s.id}
                  href={ev?.evalId ? `/report/${ev.evalId}` : '#'}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'background 0.15s',
                  }}>
                    {/* Poster thumbnail */}
                    <div style={{
                      width: 40, height: 50, borderRadius: 3, flexShrink: 0, overflow: 'hidden',
                      background: s.poster_url
                        ? undefined
                        : 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.15))',
                    }}>
                      {s.poster_url && (
                        <img
                          src={s.poster_url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#fff', fontSize: 14, fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {s.title}
                      </div>
                      {meta && (
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                          {meta}
                        </div>
                      )}
                    </div>

                    {/* Role pill */}
                    <div style={{
                      background: 'rgba(124,58,237,0.2)', color: '#c4b5fd',
                      fontSize: 11, fontWeight: 600, padding: '3px 8px',
                      borderRadius: 3, textTransform: 'capitalize' as const,
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}>
                      {role}
                    </div>

                    {/* Score */}
                    {score != null && (
                      <div style={{
                        fontSize: 16, fontWeight: 700, color: '#a78bfa',
                        flexShrink: 0, minWidth: 32, textAlign: 'right'
                      }}>
                        {Math.round(score)}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: People ── */}
      <div>
        <h2 style={{
          fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const,
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', marginBottom: 14
        }}>
          People
        </h2>

        {people.length === 0 ? (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 4,
            padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13
          }}>
            No collaborators yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {people.map((p, i) => {
              const displayName = p.name || p.email || 'Unknown'
              const initials = p.name
                ? p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                : (p.email ? p.email[0].toUpperCase() : '?')

              return (
                <div
                  key={p.id || p.email || i}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4,
                    padding: '14px 16px',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: p.avatar_url
                      ? undefined
                      : 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(168,85,247,0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    color: '#c4b5fd', fontSize: 13, fontWeight: 600,
                  }}>
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  {/* Name + headline + shared scripts */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                      {displayName}
                    </div>
                    {p.headline && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 }}>
                        {p.headline}
                      </div>
                    )}
                    {p.sharedScripts.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {p.sharedScripts.map(s => (
                          <Link
                            key={s.id}
                            href={s.evalId ? `/report/${s.evalId}` : '#'}
                            style={{
                              background: 'rgba(124,58,237,0.2)', color: '#c4b5fd',
                              fontSize: 11, fontWeight: 500, padding: '2px 8px',
                              borderRadius: 3, textDecoration: 'none',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              maxWidth: 200, display: 'inline-block'
                            }}
                          >
                            {s.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
