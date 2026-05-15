// LandingHeroSection — wraps hero + inline onboarding.
// "Get started" swaps the hero for the onboarding flow in-place.
// The rest of the landing page stays scrollable below.
'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { LandingHero } from './landing-hero'
import { OnboardingClient } from '@/app/(app)/onboarding/onboarding-client'

const fadeIn: CSSProperties = {
  animation: 'hero-section-fade 0.4s ease-out both',
}

export function LandingHeroSection() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Scroll to top when entering onboarding
  useEffect(() => {
    if (showOnboarding) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [showOnboarding])

  // Listen for nav "Get started" click (custom event)
  useEffect(() => {
    function onNavStart() { setShowOnboarding(true) }
    window.addEventListener('gem:start-onboarding', onNavStart)
    return () => window.removeEventListener('gem:start-onboarding', onNavStart)
  }, [])

  return (
    <>
      <style>{`
        @keyframes hero-section-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {!showOnboarding ? (
        <LandingHero onStart={() => setShowOnboarding(true)} />
      ) : (
        <section
          className="relative"
          style={{
            minHeight: 'calc(100vh - 56px)',
            background: 'linear-gradient(180deg, #1a1025 0%, #0f0a18 50%, #0a0a0f 100%)',
            display: 'flex',
            flexDirection: 'column',
            ...fadeIn,
          }}
        >
          {/* Back / close button */}
          <div className="max-w-lg mx-auto w-full px-4 pt-6">
            <button
              onClick={() => setShowOnboarding(false)}
              className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-100"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>

          {/* Onboarding in a white card */}
          <div className="flex-1 flex items-start justify-center px-4 pb-12">
            <div
              className="w-full max-w-lg mt-4 rounded-2xl"
              style={{
                background: '#ffffff',
                boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
              }}
            >
              <OnboardingClient />
            </div>
          </div>
        </section>
      )}
    </>
  )
}
