// /opportunities/[slug]/apply — apply to an opportunity.
// Writer selects ONE qualifying script + optional pitch, then submits.
// One script per application — keeps feedback specific and pointed.

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'

type Script = {
  id: string
  title: string
  score: number | null
  format: string | null
  genres: string[]
}

type Opportunity = {
  id: string
  title: string
  slug: string
  description: string
  min_score: number | null
  formats: string[] | null
  genres: string[] | null
  subtitle: string | null
}

export default function ApplyPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const preselectedScript = searchParams.get('script')

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [scripts, setScripts] = useState<Script[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(preselectedScript)
  const [pitch, setPitch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Check Pro status — free users can't apply
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()
      if (profile?.subscription_status !== 'active') {
        router.push(`/opportunities/${slug}`)
        return
      }

      // Load opportunity
      const { data: opp } = await supabase
        .from('opportunities')
        .select('id, title, slug, description, min_score, formats, genres, subtitle')
        .eq('slug', slug)
        .eq('status', 'active')
        .eq('published', true)
        .single()

      if (!opp) { router.push('/opportunities'); return }
      setOpportunity(opp)

      // Load user's completed scripts with evaluations
      const { data: subs } = await supabase
        .from('script_submissions')
        .select('id, title, declared_format, script_evaluations(weighted_score, evaluation)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('hidden_at', null)
        .order('created_at', { ascending: false })

      const qualifying = (subs || [])
        .map((s: any) => {
          const ev = Array.isArray(s.script_evaluations) ? s.script_evaluations[0] : s.script_evaluations
          const score = ev?.weighted_score ?? null
          const evJson = ev?.evaluation as Record<string, unknown> | null
          const cls = (evJson?.classification as Record<string, unknown>) || {}
          const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
          const genreSet = new Set<string>()
          for (const raw of [cls.genre_primary as string, ...(cls.genre_secondary as string[] ?? []), ...(cls.genre_tags as string[] ?? [])]) {
            const n = (raw ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
            if (n) genreSet.add(n)
          }
          const format = (cls.format as string) || (fmt.format as string) || s.declared_format || null
          return { id: s.id, title: s.title, score, format, genres: Array.from(genreSet) }
        })
        .filter((s: Script) => {
          if (opp.min_score && (!s.score || s.score < opp.min_score)) return false
          const noFormatFilter = !opp.formats || opp.formats.length === 0
          const noGenreFilter = !opp.genres || opp.genres.length === 0
          if (noFormatFilter && noGenreFilter) return true
          const fmtMatch = noFormatFilter || (s.format && opp.formats!.some((f: string) => f.toLowerCase() === s.format!.toLowerCase()))
          if (!fmtMatch) return false
          if (noGenreFilter) return true
          if (s.genres.length === 0) return false
          const oppNorm = opp.genres!.map((g: string) => g.toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim())
          return s.genres.some((sg: string) => oppNorm.some((og: string) => sg.includes(og) || og.includes(sg)))
        })

      setScripts(qualifying)
      setLoading(false)
    }
    load()
  }, [slug, router, preselectedScript])

  async function handleSubmit() {
    if (!selectedId) { setError('Select a script'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/consideration/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunity_id: opportunity!.id,
        script_ids: [selectedId],
        writer_pitch: pitch.trim() || undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setSubmitting(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!opportunity) return null

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
          ← Back to dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-gray-900 mt-2 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
          Apply: {opportunity.title}
        </h1>
        <p className="text-[13px] text-gray-500 m-0">{opportunity.description}</p>
        <div className="flex items-center gap-3 mt-2">
          {opportunity.min_score && (
            <span className="text-[11px] text-gray-400">Min score: {opportunity.min_score}</span>
          )}
          {opportunity.subtitle && (
            <span className="text-[11px] text-gray-400">{opportunity.subtitle}</span>
          )}
        </div>
      </div>

      {/* Script selection — single select */}
      <div>
        <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-1">Select your script</h2>
        <p className="text-[12px] text-gray-400 m-0 mb-2.5">One script per application. You can apply again with a different script after receiving feedback.</p>
        {scripts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
            <p className="text-[13px] text-gray-500 m-0">None of your scripts currently qualify for this opportunity.</p>
            <p className="text-[12px] text-gray-400 m-0 mt-1">Upload a new script or improve your scores.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scripts.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                  selectedId === s.id
                    ? 'border-purple-400 bg-purple-50/50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedId === s.id ? 'border-purple-600' : 'border-gray-300'
                  }`}>
                    {selectedId === s.id && (
                      <div className="w-2 h-2 rounded-full bg-purple-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.format && <span className="text-[11px] text-gray-400">{s.format}</span>}
                      {s.genres[0] && <span className="text-[11px] text-gray-400">· {s.genres[0]}</span>}
                    </div>
                  </div>
                  {s.score && (
                    <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      s.score >= 80 ? 'bg-green-50 text-green-700' :
                      s.score >= 70 ? 'bg-blue-50 text-blue-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      {Math.round(s.score)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Optional pitch */}
      <div>
        <label className="text-[14px] font-bold text-gray-900 block mb-1.5">
          Why is this a fit? <span className="text-[12px] font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Tell us why you think this script is right for this opportunity..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
          rows={3}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-[13px] text-red-600 m-0">{error}</p>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedId}
          className="inline-flex items-center text-[14px] font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit application'}
        </button>
        <Link href="/dashboard" className="text-[13px] text-gray-400 hover:text-gray-700">
          Cancel
        </Link>
      </div>
    </div>
  )
}
