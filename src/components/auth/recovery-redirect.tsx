'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

/**
 * Detects Supabase PASSWORD_RECOVERY events from the URL hash
 * and redirects to /reset-password where the user can set a new password.
 * Mount this in the root layout.
 *
 * Two detection paths:
 * 1. Direct hash check — if the URL contains type=recovery in the hash,
 *    redirect immediately before Supabase even processes the token.
 * 2. Auth event listener — catches PASSWORD_RECOVERY event as a fallback.
 */
export function RecoveryRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Path 1: Check URL hash directly for recovery tokens
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      // Let Supabase process the token first, then redirect
      const supabase = createClient()
      supabase.auth.getSession().then(() => {
        window.location.href = '/reset-password'
      })
      return
    }

    // Path 2: Listen for auth state change event
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return null
}
