'use client'

// Mounts the PaywallModal under control of the global
// `gem:open-upgrade-modal` event. Mirrors the pattern used by
// SubscribeGate on the report page so dashboard CTAs that paywall a
// flow can dispatch the same event without owning their own modal.
//
// Mount this once near the top of the writer dashboard for free-tier
// users. Pro users don't need the listener at all.

import { useEffect, useState } from 'react'
import { PaywallModal } from '@/components/ui/paywall-modal'

export function UpgradeModalListener() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('gem:open-upgrade-modal', handler)
    return () => window.removeEventListener('gem:open-upgrade-modal', handler)
  }, [])

  if (!open) return null
  return <PaywallModal onClose={() => setOpen(false)} trialExpired={false} />
}
