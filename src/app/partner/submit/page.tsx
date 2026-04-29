// /partner/submit — producer-only private script submission.
//
// Anuj 2026-04-30: industry partners can submit their own scripts for a
// private GEM read. Always private to them, never matched, never
// published. No subscription gate (producers aren't on the writer
// trial/Pro plan). Posts the same FormData payload to
// /api/start-submission then /api/score-submission as the writer flow,
// but the score-submission route detects the producer-owned case and
// short-circuits matching + auto-publish.

import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { ProducerSubmitForm } from '@/components/partner/producer-submit-form'

export const dynamic = 'force-dynamic'

export default async function ProducerSubmitPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/partner/submit')

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') {
    redirect('/dashboard')
  }

  return (
    <>
      <Nav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-16">
        <div className="mb-8">
          <div
            aria-hidden
            className="w-12 h-0.5 mb-3.5 rounded-sm"
            style={{ background: 'var(--gem-gold)' }}
          />
          <h1 className="text-3xl sm:text-[32px] font-extrabold font-[family-name:var(--font-display)] tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2">
            Submit a script
          </h1>
          <p className="text-[15px] text-[var(--gem-gray-300)] m-0 leading-[1.55] max-w-[60ch]">
            Add your own scripts for a private GEM read. Always private to
            you. Submit as many as you want — every script you add helps us
            tune your matched feed over time.
          </p>
        </div>

        <ProducerSubmitForm />
      </div>
    </>
  )
}
