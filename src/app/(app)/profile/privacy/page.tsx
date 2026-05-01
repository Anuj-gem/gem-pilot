// /profile/privacy — standalone privacy settings page.
// Anuj 2026-04-30 v0.10.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { normalizePrivacyDefaults } from '@/lib/privacy-defaults'
import { PrivacyForm } from '@/components/privacy/privacy-form'

export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/profile/privacy')

  const { data: profile } = await supabase
    .from('profiles')
    .select('privacy_defaults')
    .eq('id', user.id)
    .single<{ privacy_defaults: unknown }>()

  const initial = normalizePrivacyDefaults(profile?.privacy_defaults)

  return (
    <div>
      <header className="mb-6">
        <Link href="/dashboard" prefetch={false} className="text-[12px] text-gray-500 hover:text-gray-900 font-semibold">
          ← Back to dashboard
        </Link>
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mt-3 mb-2">Privacy</p>
        <h1 className="text-[28px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          Your privacy settings
        </h1>
        <p className="text-[13.5px] text-gray-600 mt-1 leading-snug max-w-[60ch]">
          These apply to all your scripts. You can change them anytime — new scripts inherit your defaults; existing public scripts stay public, existing private scripts stay private.
        </p>
      </header>
      <PrivacyForm initial={initial} submitLabel="Save settings" />
    </div>
  )
}
