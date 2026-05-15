// /submit — the logged-in home page. Upload a script + see recent scripts.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import { UploadCTAButton } from '@/components/upload-cta-button'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function SubmitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[22px] font-bold text-gray-900 m-0 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          Submit a script
        </h1>
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">Get your script evaluated</p>
          <p className="text-[13px] text-gray-400 m-0 mb-4">Upload a screenplay PDF and get a scored report in under a minute.</p>
          <UploadCTAButton
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-bold text-white transition-all hover:brightness-110 cursor-pointer border-0"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
          >
            Upload a script
          </UploadCTAButton>
        </div>
      </div>
    )
  }

  const service = svc()

  // Fetch recent completed scripts (up to 5)
  type SubRow = {
    id: string; title: string; status: string; declared_format: string | null
    created_at: string; hidden_at: string | null; is_public: boolean | null
  }
  const { data: mySubs } = await supabase
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at, hidden_at, is_public')
    .eq('user_id', user.id)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  const scripts = (mySubs as SubRow[] | null) || []
  const submissionIds = scripts.map(s => s.id)

  // Get eval scores
  const evalBySub = new Map<string, { id: string; score: number | null }>()
  if (submissionIds.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score')
      .in('submission_id', submissionIds)
    for (const e of (evs || []) as any[]) {
      evalBySub.set(e.submission_id, { id: e.id, score: e.weighted_score })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold text-gray-900 m-0 mb-5" style={{ fontFamily: 'Georgia, serif' }}>
        Submit a script
      </h1>

      {/* Upload CTA */}
      <div
        className="rounded-xl px-6 py-8 text-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02))',
          border: '1.5px dashed rgba(124,58,237,0.3)',
        }}
      >
        <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">Upload a screenplay</p>
        <p className="text-[13px] text-gray-400 m-0 mb-4">PDF format. Get your scored report in under a minute.</p>
        <UploadCTAButton
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[14px] font-bold text-white transition-all hover:brightness-110 cursor-pointer border-0"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
        >
          Choose file
        </UploadCTAButton>
      </div>

      {/* Recent scripts */}
      {scripts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-gray-900 m-0">Recent scripts</h2>
            <Link href="/scripts" className="text-[12px] font-semibold text-purple-600 hover:text-purple-700 transition-colors">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {scripts.map(s => {
              const ev = evalBySub.get(s.id)
              const isProcessing = s.status === 'processing' || s.status === 'queued'
              return (
                <div key={s.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                    <p className="text-[12px] text-gray-400 m-0 mt-0.5">
                      {isProcessing ? 'Processing...' : new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {ev?.score != null && (
                      <span className="text-[13px] font-bold text-purple-600">{Math.round(ev.score)}</span>
                    )}
                    {ev?.id && (
                      <Link
                        href={`/report/${ev.id}`}
                        className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        View report
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
