'use client'

// DashboardHeroSection — manages the hero shown at the top of the dashboard.
//
// Anonymous users with no scripts: show LandingHero.
// On "Get started" click: LandingHero slides out left, FormatSelectorHero slides in from right.
// Logged-in users (or anon with scripts): show FormatSelectorHero directly.

import { useState, useEffect } from 'react'
import { LandingHero } from './landing-hero'
import { FormatSelectorHero } from './format-selector-hero'

type Props = {
  showLanding: boolean
  evalsRemaining: number
}

export function DashboardHeroSection({ showLanding, evalsRemaining }: Props) {
  const [phase, setPhase] = useState<'landing' | 'sliding-out' | 'sliding-in' | 'upload'>(
    showLanding ? 'landing' : 'upload'
  )

  function handleGetStarted() {
    setPhase('sliding-out')
  }

  useEffect(() => {
    if (phase === 'sliding-out') {
      const t = setTimeout(() => setPhase('sliding-in'), 350)
      return () => clearTimeout(t)
    }
    if (phase === 'sliding-in') {
      const t = setTimeout(() => setPhase('upload'), 400)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Logged-in or returning anon — no animation wrapper
  if (!showLanding && phase === 'upload') {
    return <FormatSelectorHero evalsRemaining={evalsRemaining} />
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Landing hero — slides out left */}
      {(phase === 'landing' || phase === 'sliding-out') && (
        <div
          style={{
            transition: 'transform 0.35s ease-in-out, opacity 0.3s ease-in-out',
            transform: phase === 'sliding-out' ? 'translateX(-100%)' : 'translateX(0)',
            opacity: phase === 'sliding-out' ? 0 : 1,
          }}
        >
          <LandingHero onGetStarted={handleGetStarted} />
        </div>
      )}

      {/* Upload hero — slides in from right */}
      {(phase === 'sliding-in' || phase === 'upload') && (
        <div
          style={{
            transition: 'transform 0.4s ease-out, opacity 0.35s ease-out',
            transform: phase === 'sliding-in' ? 'translateX(0)' : 'translateX(0)',
            opacity: 1,
            animation: phase === 'sliding-in' ? 'slideInFromRight 0.4s ease-out forwards' : 'none',
          }}
        >
          <FormatSelectorHero evalsRemaining={evalsRemaining} />
        </div>
      )}

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(60px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
