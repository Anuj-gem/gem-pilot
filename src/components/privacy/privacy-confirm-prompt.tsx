'use client'

// PrivacyConfirmPrompt — full-screen blocking takeover for users who
// haven't yet confirmed their privacy defaults (privacy_confirmed_at
// is NULL). Mandatory — no dismiss. The PrivacyForm calls our API
// which sets `privacy_confirmed_at`; once set, the layout stops
// rendering this prompt.
//
// Anuj 2026-04-30 v0.10: "everybody who re logs in to have to choose
// these settings".

import { useEffect } from 'react'
import { PrivacyForm } from './privacy-form'
import { type PrivacyDefaults } from '@/lib/privacy-defaults'

interface Props {
  initial: PrivacyDefaults
}

export function PrivacyConfirmPrompt({ initial }: Props) {
  // Lock background scroll while the prompt is up.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-black/55 backdrop-blur-sm overflow-y-auto"
    >
      <div className="w-full sm:max-w-xl bg-white sm:rounded-2xl shadow-2xl my-0 sm:my-8">
        <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-[22px] sm:text-[24px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            Your privacy defaults
          </h2>
          <p className="text-[13px] text-gray-600 mt-1.5 leading-snug">
            You can change these anytime.
          </p>
        </div>
        <div className="px-5 sm:px-7 py-5">
          <PrivacyForm
            initial={initial}
            submitLabel="Confirm and continue"
          />
        </div>
      </div>
    </div>
  )
}
