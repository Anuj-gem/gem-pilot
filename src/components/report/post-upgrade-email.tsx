'use client'

import { useEffect } from 'react'

/** Fires the post_upgrade email on mount. Renders nothing. */
export function PostUpgradeEmail() {
  useEffect(() => {
    fetch('/api/send-upgrade-email', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
