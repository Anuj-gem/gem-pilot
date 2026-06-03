'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

/**
 * Detects Supabase PASSWORD_RECOVERY events from the URL hash
 * and redirects to /reset-password where the user can set a new password.
 * Mount this in the root layout.
 */
export function RecoveryRedirect() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/reset-password')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return null
}
