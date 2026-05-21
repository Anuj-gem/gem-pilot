// /opportunities/[slug]/apply — apply to an opportunity.
// Writer selects ONE qualifying script + optional application responses, then submits.
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
  evalId?: string | null
}

type ApplicationQuestion = {
  id: string
  prompt: string
}

type MediaItem = {
  type: 'image' | 'youtube' | 'file'
  url: string
  filename?: string
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
  application_questions: ApplicationQuestion[] | null
}

export default function ApplyPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const preselectedScript = searchParams.get('script')

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [scripts, setScripts] = useState<Script[]>([])
  const [previouslyConsidered, setPreviouslyConsidered] = useState<Script[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(preselectedScript)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [youtubeInput, setYoutubeInput] = useState('')
  const [youtubeError, setYoutubeError] = useState('')
  const [mediaUploading, setMediaUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [atCap, setAtCap] = useState(false)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Check subscription + free cap
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()
      const pro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
      setIsPro(pro)
      if (!pro) {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { count } = await supabase
          .from('considerations')
          .select('id', { count: 'exact', head: true })
          .eq('writer_id', user.id)
          .not('opportunity_id', 'is', null)
          .gte('created_at', monthStart)
        if ((count ?? 0) >= 2) {
          setAtCap(true)
        }
      }

      // Load opportunity
      const { data: opp } = await supabase
        .from('opportunities')
        .select('id, title, slug, description, min_score, formats, genres, subtitle, application_questions')
        .eq('slug', slug)
        .eq('status', 'active')
        .single()

      if (!opp) { router.push('/opportunities'); return }
      setOpportunity(opp)

      // Check if user already has an ACTIVE (non-complete) consideration for this opportunity
      const { data: existing } = await supabase
        .from('considerations')
        .select('id')
        .eq('writer_id', user.id)
        .eq('opportunity_id', opp.id)
        .neq('review_stage', 'complete')
        .limit(1)
        .maybeSingle()

      if (existing) {
        setAlreadyApplied(true)
        setLoading(false)
        return
      }

      // Get scripts already submitted in completed considerations for this opp
      const { data: completedCons } = await supabase
        .from('considerations')
        .select('id')
        .eq('writer_id', user.id)
        .eq('opportunity_id', opp.id)
        .eq('review_stage', 'complete')
      const completedConIds = (completedCons || []).map((c: any) => c.id)
      const alreadySubmittedIds = new Set<string>()
      if (completedConIds.length > 0) {
        const { data: prevScripts } = await supabase
          .from('consideration_scripts')
          .select('script_submission_id')
          .in('consideration_id', completedConIds)
        for (const ps of (prevScripts || []) as any[]) {
          alreadySubmittedIds.add(ps.script_submission_id)
        }
      }

      // Load user's completed scripts with evaluations
      const { data: subs } = await supabase
        .from('script_submissions')
        .select('id, title, declared_format, script_evaluations(id, weighted_score, evaluation)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('hidden_at', null)
        .order('created_at', { ascending: false })

      const allMapped = (subs || []).map((s: any) => {
          const ev = Array.isArray(s.script_evaluations) ? s.script_evaluations[0] : s.script_evaluations
          const score = ev?.weighted_score ?? null
          const evalId = ev?.id ?? null
          const evJson = ev?.evaluation as Record<string, unknown> | null
          const cls = (evJson?.classification as Record<string, unknown>) || {}
          const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
          const genreSet = new Set<string>()
          for (const raw of [cls.genre_primary as string, ...(cls.genre_secondary as string[] ?? []), ...(cls.genre_tags as string[] ?? [])]) {
            const n = (raw ?? '').toLowerCase().replace(/[‐-―–—_/]/g, '-').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim()
            if (n) genreSet.add(n)
          }
          const format = (cls.format as string) || (fmt.format as string) || s.declared_format || null
          return { id: s.id, title: s.title, score, format, genres: Array.from(genreSet), evalId }
        })

      // Split into previously considered vs available
      const prevConsidered = allMapped.filter((s: Script) => alreadySubmittedIds.has(s.id))
      const qualifying = allMapped
        .filter((s: Script) => !alreadySubmittedIds.has(s.id))
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
      setPreviouslyConsidered(prevConsidered)
      setLoading(false)
    }
    load()
  }, [slug, router, preselectedScript])

  function setResponse(key: string, value: string) {
    setResponses(prev => ({ ...prev, [key]: value }))
  }

  function isYoutubeUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url.trim())
  }

  function addYoutubeUrl() {
    const url = youtubeInput.trim()
    if (!url) return
    if (!isYoutubeUrl(url)) {
      setYoutubeError('Enter a valid YouTube URL')
      return
    }
    setYoutubeError('')
    setMediaItems(prev => [...prev, { type: 'youtube', url }])
    setYoutubeInput('')
  }

  function removeMedia(index: number) {
    setMediaItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMediaUploading(false); return }
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('application-media').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('application-media').getPublicUrl(path)
      setMediaItems(prev => [...prev, { type: 'image', url: publicUrl, filename: file.name }])
    }
    setMediaUploading(false)
    e.target.value = ''
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMediaUploading(false); return }
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('application-media').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('application-media').getPublicUrl(path)
      setMediaItems(prev => [...prev, { type: 'file', url: publicUrl, filename: file.name }])
    }
    setMediaUploading(false)
    e.target.value = ''
  }

  function getYoutubeEmbedUrl(url: string): string {
    // Convert watch?v= and youtu.be/ links to embed links
    const watchMatch = url.match(/[?&]v=([^&]+)/)
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
    const shortMatch = url.match(/youtu\.be\/([^?]+)/)
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
    return url
  }

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
        application_responses: responses,
        media_urls: mediaItems,
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

  if (alreadyApplied) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <Link href="/opportunities" className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
            ← Back to opportunities
          </Link>
          <h1 className="text-[20px] font-bold text-gray-900 mt-2 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {opportunity.title}
          </h1>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 px-5 py-6 text-center">
          <p className="text-[15px] font-semibold text-purple-800 m-0 mb-1">Application Pending</p>
          <p className="text-[13px] text-gray-600 m-0">You already have a pending application for this opportunity. We'll notify you when there's an update.</p>
        </div>
        <Link href="/opportunities" className="inline-flex items-center text-[13px] font-semibold text-purple-600 hover:text-purple-800">
          ← View all opportunities
        </Link>
      </div>
    )
  }

  if (atCap) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <Link href={`/opportunities/${slug}`} className="text-[12px] text-gray-400 hover:text-gray-700 font-semibold">
            ← Back to opportunity
          </Link>
          <h1 className="text-[20px] font-bold text-gray-900 mt-2 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {opportunity.title}
          </h1>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-center">
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">You've used your 2 free applications this month</p>
          <p className="text-[13px] text-gray-500 m-0 mb-4">Become a member for unlimited applications and full access to all opportunities.</p>
          <Link
            href="/pricing"
            className="inline-block rounded-xl px-6 py-2.5 text-[14px] font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            Become a member
          </Link>
        </div>
        <Link href="/opportunities" className="inline-flex items-center text-[13px] font-semibold text-purple-600 hover:text-purple-800">
          ← View all opportunities
        </Link>
      </div>
    )
  }

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
        <p className="text-[13px] text-gray-600 m-0">{opportunity.description}</p>
        <div className="flex items-center gap-3 mt-2">
          {opportunity.min_score && (
            <span className="text-[11px] text-gray-500">Min score: {opportunity.min_score}</span>
          )}
          {opportunity.subtitle && (
            <span className="text-[11px] text-gray-500">{opportunity.subtitle}</span>
          )}
        </div>
      </div>

      {/* Previous applications notice */}
      {previouslyConsidered.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[13px] text-gray-700 m-0 mb-2">
            You've applied to this opportunity <strong>{previouslyConsidered.length} {previouslyConsidered.length === 1 ? 'time' : 'times'}</strong> before with:
          </p>
          <div className="space-y-1">
            {previouslyConsidered.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-[12px] text-gray-400">•</span>
                {s.evalId ? (
                  <Link href={`/report/${s.evalId}`} className="text-[13px] text-purple-600 hover:text-purple-800 font-medium truncate">
                    {s.title}
                  </Link>
                ) : (
                  <span className="text-[13px] text-gray-700 font-medium truncate">{s.title}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Script selection — single select */}
      <div>
        <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-1">Select your script</h2>
        <p className="text-[12px] text-gray-600 m-0 mb-2.5">One script per application. You can apply again with a different script after receiving feedback.</p>
        {scripts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
            <p className="text-[13px] text-gray-500 m-0">None of your scripts currently qualify for this opportunity.</p>
            <p className="text-[12px] text-gray-600 m-0 mt-1">Upload a new script or improve your scores.</p>
          </div>
        ) : (
          <>
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
                        {s.format && <span className="text-[11px] text-gray-500">{s.format}</span>}
                        {s.genres[0] && <span className="text-[11px] text-gray-500">· {s.genres[0]}</span>}
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
            {previouslyConsidered.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wide m-0">Already considered</p>
                {previouslyConsidered.map(s => (
                  <div
                    key={s.id}
                    className="w-full text-left rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-500 m-0 truncate">{s.title}</p>
                        <p className="text-[11px] text-gray-500 m-0 mt-0.5">Previously reviewed for this opportunity</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Universal application dimensions */}
      <div className="space-y-4">
        <div>
          <h2 className="text-[14px] font-bold text-gray-900 m-0 mb-0.5">Application</h2>
          <p className="text-[12px] text-gray-600 m-0">All fields are optional. Fill in what's relevant.</p>
        </div>

        {/* Fit & originality */}
        <div>
          <label className="text-[14px] font-semibold text-gray-800 block mb-1">
            Fit & originality <span className="text-[12px] font-normal text-gray-500">(optional)</span>
          </label>
          <p className="text-[12px] text-gray-600 m-0 mb-1.5">Why is this the right fit for this opportunity? What makes it special?</p>
          <textarea
            value={responses.fit_originality || ''}
            onChange={(e) => setResponse('fit_originality', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
            rows={3}
            placeholder="What makes this script the right fit..."
          />
        </div>

        {/* Market potential */}
        <div>
          <label className="text-[14px] font-semibold text-gray-800 block mb-1">
            Market potential <span className="text-[12px] font-normal text-gray-500">(optional)</span>
          </label>
          <p className="text-[12px] text-gray-600 m-0 mb-1.5">Where does this distribute, how big is the audience, and what comparable projects exist? What's the competitive landscape?</p>
          <textarea
            value={responses.market_potential || ''}
            onChange={(e) => setResponse('market_potential', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
            rows={3}
            placeholder="Distribution, audience, comps, competitive landscape..."
          />
        </div>

        {/* Casting */}
        <div>
          <label className="text-[14px] font-semibold text-gray-800 block mb-1">
            Casting <span className="text-[12px] font-normal text-gray-500">(optional)</span>
          </label>
          <p className="text-[12px] text-gray-600 m-0 mb-1.5">Any talent attached or in mind? What kind of performer does this attract and why?</p>
          <textarea
            value={responses.casting || ''}
            onChange={(e) => setResponse('casting', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
            rows={3}
            placeholder="Attached talent, casting vision..."
          />
        </div>


        {/* Media & references */}
        <div>
          <label className="text-[14px] font-semibold text-gray-800 block mb-1">
            Media & references <span className="text-[12px] font-normal text-gray-500">(optional)</span>
          </label>
          <p className="text-[12px] text-gray-600 m-0 mb-2.5">Images, YouTube links, or supporting documents.</p>

          {/* Existing media previews */}
          {mediaItems.length > 0 && (
            <div className="space-y-2 mb-3">
              {mediaItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  {item.type === 'image' && (
                    <div className="relative group flex-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.filename || 'Uploaded image'} className="rounded-lg border border-gray-200 max-h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 bg-white/90 rounded-full w-5 h-5 flex items-center justify-center text-[11px] text-gray-500 hover:text-red-500 border border-gray-200"
                      >×</button>
                    </div>
                  )}
                  {item.type === 'youtube' && (
                    <div className="relative flex-1">
                      <iframe
                        src={getYoutubeEmbedUrl(item.url)}
                        className="w-full rounded-lg border border-gray-200"
                        style={{ height: '180px' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 bg-white/90 rounded-full w-5 h-5 flex items-center justify-center text-[11px] text-gray-500 hover:text-red-500 border border-gray-200"
                      >×</button>
                    </div>
                  )}
                  {item.type === 'file' && (
                    <div className="flex items-center gap-2 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <span className="text-[13px] text-gray-700 truncate flex-1">{item.filename || 'Document'}</span>
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="text-[12px] text-gray-400 hover:text-red-500 shrink-0"
                      >Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* YouTube URL input */}
          <div className="mb-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={youtubeInput}
                onChange={(e) => { setYoutubeInput(e.target.value); setYoutubeError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addYoutubeUrl() } }}
                placeholder="YouTube URL..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
              />
              <button
                type="button"
                onClick={addYoutubeUrl}
                className="text-[13px] font-semibold text-purple-600 hover:text-purple-700 px-3 py-2 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100 transition-colors shrink-0"
              >Add</button>
            </div>
            {youtubeError && <p className="text-[12px] text-red-500 mt-1 m-0">{youtubeError}</p>}
          </div>

          {/* Image + file upload buttons */}
          <div className="flex gap-2">
            <label className={`cursor-pointer text-[13px] font-semibold text-gray-600 hover:text-gray-800 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors ${mediaUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {mediaUploading ? 'Uploading...' : '+ Image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={mediaUploading} />
            </label>
            <label className={`cursor-pointer text-[13px] font-semibold text-gray-600 hover:text-gray-800 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors ${mediaUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {mediaUploading ? 'Uploading...' : '+ Document'}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={mediaUploading} />
            </label>
          </div>
        </div>

        {/* Custom questions from the opportunity */}
        {(opportunity.application_questions || []).map((q) => (
          <div key={q.id}>
            <label className="text-[14px] font-semibold text-gray-800 block mb-1">
              {q.prompt} <span className="text-[12px] font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              value={responses[q.id] || ''}
              onChange={(e) => setResponse(q.id, e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
              rows={3}
              placeholder="Your answer..."
            />
          </div>
        ))}
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
