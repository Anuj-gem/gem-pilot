// Reviewer page — /review/[script_id]
//
// Anuj 2026-04-29 (peer-reviews v0.1) → opened up 2026-04-30 v0.10.14:
// any signed-in GEM member can review any public completed script. The
// old `is_reviewer` / per-script-invite gate is gone — the actual rules
// (auth, not-the-owner, public+completed, allow_reviews on) live in
// /app/review/[id]/actions.ts where they belong.
//
// The page shows the script's metadata + the Selznick anchor (score,
// headline, logline) so the reviewer can read the system's take
// alongside their own. Reviewer fills a 3-field form (score, body,
// suggestion) and submits via a server action.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound, redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Link from 'next/link'
import { ReviewForm } from './review-form'

interface PageProps {
  params: Promise<{ id: string }>
}

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll() { return [] }, setAll() {} },
    }
  )
}

export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/review/${id}`)}`)
  }

  // No more reviewer gate (Anuj 2026-04-30 v0.10.14). Reviews are open
  // to anyone in the GEM community on any public, completed script.
  // The action handler in actions.ts enforces all the real rules
  // (not-the-owner, allow_reviews on, etc.).
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single<{ full_name: string | null }>()

  // Fetch the submission + evaluation + writer info via service client
  // (RLS would block a reviewer from seeing other writers' rows otherwise).
  const service = createServiceClient()
  const { data: submission } = await service
    .from('script_submissions')
    .select(`
      id, title, filename, file_url, status, declared_format, created_at,
      profiles ( full_name )
    `)
    .eq('id', id)
    .single<{
      id: string
      title: string
      filename: string
      file_url: string | null
      status: string
      declared_format: string | null
      created_at: string
      profiles: { full_name: string | null } | null
    }>()

  if (!submission) notFound()

  const { data: evaluation } = await service
    .from('script_evaluations')
    .select('id, weighted_score, tier, evaluation, edited_fields')
    .eq('submission_id', id)
    .maybeSingle<{
      id: string
      weighted_score: number | null
      tier: string | null
      evaluation: any
      edited_fields: any
    }>()

  // Existing review by this reviewer (if any) — supports edit
  const { data: existingReview } = await service
    .from('peer_reviews')
    .select('id, score, body, suggestion, created_at, updated_at')
    .eq('submission_id', id)
    .eq('reviewer_id', user.id)
    .is('deleted_at', null)
    .maybeSingle<{
      id: string
      score: number
      body: string
      suggestion: string | null
      created_at: string
      updated_at: string
    }>()

  const writerName = submission.profiles?.full_name || 'Anonymous writer'
  const headline =
    evaluation?.edited_fields?.logline ||
    evaluation?.evaluation?.positioning_hook ||
    null
  const logline =
    evaluation?.edited_fields?.logline ||
    evaluation?.evaluation?.format_detection?.logline_one_line ||
    null

  // Try to construct a download URL from the storage path
  let downloadHref: string | null = null
  if (submission.file_url) {
    const { data: signed } = await service.storage
      .from('scripts')
      .createSignedUrl(submission.file_url, 60 * 60 * 24) // 24 hours
    downloadHref = signed?.signedUrl ?? null
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-2">
          <Link
            href={`/report/${evaluation?.id ?? id}`}
            className="text-xs font-semibold text-gray-500 hover:text-gray-900"
          >
            ← Back to report
          </Link>
        </div>

        {/* Script header */}
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-2">
            Reviewing for {writerName}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            {submission.title}
          </h1>

          {/* Selznick anchor card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-start gap-4">
              {evaluation?.weighted_score != null && (
                <div className="shrink-0 flex flex-col items-center justify-center rounded-lg" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.30)', minWidth: 64, padding: '8px 12px' }}>
                  <span className="text-[9px] uppercase tracking-[0.16em] font-bold text-purple-700 mb-1">Selznick</span>
                  <span className="text-2xl font-bold text-gray-900 tabular-nums">{Math.round(Number(evaluation.weighted_score))}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                {headline && (
                  <>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-amber-700 mb-1">Headline</p>
                    <p className="text-[15px] font-semibold text-gray-900 leading-snug mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                      {headline}
                    </p>
                  </>
                )}
                {logline && headline !== logline && (
                  <p className="text-sm text-gray-600 leading-snug">{logline}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
              {downloadHref ? (
                <a
                  href={downloadHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 hover:text-purple-900"
                >
                  ↓ Download script PDF
                </a>
              ) : (
                <span className="text-sm text-gray-400">Script PDF unavailable</span>
              )}
              <span className="text-xs text-gray-400">·</span>
              <Link
                href={`/report/${evaluation?.id ?? id}`}
                className="text-sm font-semibold text-gray-500 hover:text-gray-900"
              >
                See full Selznick report
              </Link>
            </div>
          </div>
        </header>

        {/* Review form */}
        <ReviewForm
          submissionId={submission.id}
          existing={existingReview ?? null}
          reviewerName={profile?.full_name ?? 'You'}
        />
      </main>
    </div>
  )
}
