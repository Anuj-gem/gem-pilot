// /scripts — owner-only list of every submission the writer owns.
// All public + all private, with a simple filter.
//
// Anuj 2026-04-30 v0.7.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { ScriptCard, type ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'private', label: 'Private' },
] as const
type FilterId = (typeof FILTERS)[number]['id']

export default async function ScriptsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/scripts')

  const sp = await searchParams
  const filter = (FILTERS.some((f) => f.id === sp.filter) ? sp.filter : 'all') as FilterId

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, handle, avatar_url')
    .eq('id', user.id)
    .single()

  // Pull every submission the user owns (incl. drafts/processing). Filter
  // hidden_at out so soft-deleted scripts don't show up.
  type SubRow = {
    id: string
    title: string
    status: string
    declared_format: string | null
    created_at: string
    is_public: boolean
    hidden_at: string | null
    script_evaluations:
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }
      | { id: string; weighted_score: number | null; evaluation: unknown; edited_fields: unknown }[]
      | null
  }
  const { data: rows } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, declared_format, created_at, is_public, hidden_at,
      script_evaluations ( id, weighted_score, evaluation, edited_fields )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const visible = ((rows as SubRow[] | null) || []).filter((s) => !s.hidden_at)

  const submissionIds = visible.map((s) => s.id)
  const stats = await getScriptStats(submissionIds)

  type CardWithStatus = ScriptCardData & { status: string }
  const allCards: CardWithStatus[] = visible
    .map((sub): CardWithStatus | null => {
      const ev = Array.isArray(sub.script_evaluations) ? sub.script_evaluations[0] : sub.script_evaluations
      if (!ev) return null
      const evJson = (ev.evaluation as Record<string, unknown> | null) || null
      const editedFields = (ev.edited_fields as Record<string, unknown> | null) || null
      const editedLogline = typeof editedFields?.logline === 'string' && (editedFields.logline as string).trim().length > 0
        ? (editedFields.logline as string)
        : null
      const fmt = (evJson?.format_detection as Record<string, unknown> | undefined) || {}
      const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
      const logline = editedLogline
        || (fmt.logline_one_line as string | undefined)
        || (evJson?.positioning_hook as string | undefined)
        || null
      const genre = (cls.genre_primary as string | undefined) || (fmt.genre_primary as string | undefined) || null
      const st = stats.get(sub.id)
      return {
        submission_id: sub.id,
        evaluation_id: ev.id,
        title: sub.title,
        format: sub.declared_format,
        genre,
        logline,
        selznick_score: ev.weighted_score,
        is_public: !!sub.is_public,
        writer_handle: profile?.handle ?? null,
        writer_name: profile?.full_name ?? null,
        writer_avatar_url: profile?.avatar_url ?? null,
        review_count: st?.reviewCount ?? 0,
        avg_peer_score: st?.avgPeerScore ?? null,
        status: sub.status,
      }
    })
    .filter((c): c is CardWithStatus => c !== null)

  const counts = {
    all: allCards.length,
    published: allCards.filter((c) => c.is_public).length,
    private: allCards.filter((c) => !c.is_public).length,
  }

  const cards =
    filter === 'published' ? allCards.filter((c) => c.is_public)
    : filter === 'private' ? allCards.filter((c) => !c.is_public)
    : allCards

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <Nav />
      <main className="max-w-5xl mx-auto px-5 py-8">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-2">My library</p>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            All your scripts
          </h1>
          <p className="text-[13px] text-gray-600 mt-1">
            Everything you&apos;ve uploaded — published and private.
          </p>
        </header>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6">
          {FILTERS.map((f) => {
            const active = f.id === filter
            const params = new URLSearchParams()
            if (f.id !== 'all') params.set('filter', f.id)
            const href = `/scripts${params.toString() ? '?' + params.toString() : ''}`
            return (
              <Link
                key={f.id}
                href={href}
                prefetch={false}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${active ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {f.label} <span className={`ml-1 ${active ? 'opacity-80' : 'opacity-60'}`}>{counts[f.id]}</span>
              </Link>
            )
          })}
          <div className="flex-1" />
          <Link
            href="/submit"
            prefetch={false}
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5"
          >
            + Submit another
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-5 py-12 text-center bg-white">
            <p className="text-sm text-gray-500 mb-3">
              {filter === 'all'
                ? "You haven't uploaded any scripts yet."
                : filter === 'published'
                  ? "Nothing published yet. Open a script and toggle it public."
                  : "Nothing private — all your scripts are public."}
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
            >
              Submit a script
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => (
              <ScriptCard key={c.submission_id} s={c} density="poster" isOwner />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
