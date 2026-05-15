// LandingHeroSection — wraps hero. "Get started" opens the upload modal.
'use client'

import { useEffect } from 'react'
import { LandingHero } from './landing-hero'

export function LandingHeroSection() {
  // Listen for nav "Get started" click — open upload modal
  useEffect(() => {
    function onNavStart() {
      window.dispatchEvent(new Event('gem:open-script-upload-modal'))
    }
    window.addEventListener('gem:start-onboarding', onNavStart)
    return () => window.removeEventListener('gem:start-onboarding', onNavStart)
  }, [])

  return (
    <LandingHero onStart={() => {
      window.dispatchEvent(new Event('gem:open-script-upload-modal'))
    }} />
  )
}
