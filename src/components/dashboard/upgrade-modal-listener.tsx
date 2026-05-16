'use client'

// Mounts the PaywallModal under control of the global
// `gem:open-upgrade-modal` event. The event can carry a contextMessage
// via CustomEvent detail. Also renders when opened manually.
//
// Mount once in the (app) layout for non-Pro users.

import { useEffect, useState } from 'react'
import { PaywallModal } from '@/components/ui/paywall-modal'

interface Props {
  evalsUsed?: number
  appsUsed?: number
}

export function UpgradeModalListener({ evalsUsed = 0, appsUsed = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [contextMessage, setContextMessage] = useState<string | undefined>()

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setContextMessage(detail?.contextMessage)
      setOpen(true)
    }
    window.addEventListener('gem:open-upgrade-modal', handler)
    return () => window.removeEventListener('gem:open-upgrade-modal', handler)
  }, [])

  if (!open) return null
  return (
    <PaywallModal
      onClose={() => { setOpen(false); setContextMessage(undefined) }}
      evalsUsed={evalsUsed}
      appsUsed={appsUsed}
      contextMessage={contextMessage}
    />
  )
}
