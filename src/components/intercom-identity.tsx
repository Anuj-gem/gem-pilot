'use client'

import { useEffect } from 'react'

/**
 * Passes logged-in user identity to Intercom so conversations
 * are tied to real accounts. Render inside the authenticated
 * layout branch — does nothing if Intercom hasn't loaded yet.
 */
export function IntercomIdentity({
  name,
  email,
  userId,
}: {
  name?: string | null
  email?: string | null
  userId?: string | null
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as any
    if (typeof w.Intercom !== 'function') return

    w.Intercom('update', {
      name: name ?? undefined,
      email: email ?? undefined,
      user_id: userId ?? undefined,
    })
  }, [name, email, userId])

  return null
}
