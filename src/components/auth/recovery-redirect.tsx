'use client'

import { useEffect } from 'react'

/**
 * Detects Supabase recovery tokens in the URL hash and redirects
 * to /reset-password immediately — before any other auth processing
 * can intercept and redirect to /dashboard.
 *
 * The hash is preserved on the redirect so /reset-password can
 * process the token itself.
 */
export function RecoveryRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      // Redirect immediately to /reset-password WITH the hash fragment.
      // The reset-password page will process the Supabase token.
      window.location.replace('/reset-password' + hash)
    }
  }, [])

  return null
}
