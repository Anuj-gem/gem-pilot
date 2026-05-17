'use client'

// AnonSignupPrompt — fires the SignupGateModal when an anonymous user
// has a script in processing state. The idea: they just uploaded, the
// green confirmation appeared, now prompt them to create an account
// while they wait for the evaluation.

import { useEffect, useRef } from 'react'

export function AnonSignupPrompt() {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    // Small delay so the processing card renders first
    const timer = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('gem:open-signup-gate', {
          detail: {
            contextMessage:
              'Create an account to view your script report and apply for opportunities.',
          },
        })
      )
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  return null
}
