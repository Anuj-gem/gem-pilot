// LandingNav — sticky nav for the landing page.
// Always white bg with dark text. Once the hero CTA scrolls out of view,
// adds shadow and reveals an inline "Get started free" button.
// Mobile: 3 nav links collapse into a hamburger menu.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Compass, Briefcase, Menu, X } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

const NAV_LINKS = [
  { href: '/leaderboard', label: 'Discover', icon: Compass },
  { href: '/opportunities', label: 'Opportunities', icon: Briefcase },
]

export function LandingNav() {
  const [ctaVisible, setCtaVisible] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const el = document.getElementById('hero-cta')
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setCtaVisible(entry.isIntersecting),
      { threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const scrolled = !ctaVisible

  return (
    <>
      {/* Spacer */}
      <div className="h-16" aria-hidden />

      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.97)',
          boxShadow: scrolled ? '0 1px 8px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span
              aria-hidden="true"
              className="inline-block w-3.5 h-3.5 rotate-45"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
              }}
            />
            <span className="text-xl font-bold tracking-tight" style={{ color: '#1c1917' }}>
              GEM
            </span>
          </Link>

          {/* Desktop: links + CTA */}
          <div className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map(link => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[15px] font-medium no-underline transition-colors hover:bg-gray-50"
                  style={{ color: '#44403c' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#1c1917' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#44403c' }}
                >
                  <Icon size={17} />
                  {link.label}
                </Link>
              )
            })}

            <Link
              href="/login"
              className="ml-1 px-3 py-2 text-[15px] font-medium no-underline transition-colors hover:bg-gray-50 rounded-lg"
              style={{ color: '#78716c' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#1c1917' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#78716c' }}
            >
              Log in
            </Link>

            {/* CTA — slides in from above when hero CTA scrolls out */}
            <div
              className="ml-3 overflow-hidden transition-all duration-300"
              style={{
                maxWidth: scrolled ? '200px' : '0px',
                opacity: scrolled ? 1 : 0,
                transform: scrolled ? 'translateY(0)' : 'translateY(-8px)',
              }}
            >
              <Link
                href="/get-started"
                onClick={() => { try { trackEvent('cta_clicked', { location: 'nav', label: 'Get started free' }) } catch {} }}
                className="whitespace-nowrap inline-block px-5 py-2.5 rounded-full text-[14px] font-bold text-white no-underline transition-all hover:brightness-110"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
                }}
              >
                Get started free
              </Link>
            </div>
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {/* CTA — slides in when hero CTA scrolls out */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxWidth: scrolled ? '180px' : '0px',
                opacity: scrolled ? 1 : 0,
                transform: scrolled ? 'translateY(0)' : 'translateY(-8px)',
              }}
            >
              <Link
                href="/get-started"
                onClick={() => { try { trackEvent('cta_clicked', { location: 'nav_mobile', label: 'Get started free' }) } catch {} }}
                className="whitespace-nowrap inline-block px-4 py-2 rounded-full text-[13px] font-bold text-white no-underline"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                }}
              >
                Get started free
              </Link>
            </div>

            {/* Hamburger toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
              style={{ color: '#1c1917' }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div
            className="md:hidden px-5 pb-4 pt-1"
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {NAV_LINKS.map(link => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-[16px] font-medium no-underline transition-colors"
                  style={{ color: '#1c1917' }}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              )
            })}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-[16px] font-medium no-underline transition-colors"
              style={{ color: '#78716c' }}
            >
              Log in
            </Link>
          </div>
        )}
      </nav>
    </>
  )
}
