// LandingNav — sticky nav for the landing page.
// Transparent at top. Once the hero CTA scrolls out of view,
// transitions to white bg + shadow and reveals an inline "Get started free" button.
// Mobile: 3 nav links collapse into a hamburger menu.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Compass, Briefcase, Menu, X } from 'lucide-react'
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
      <div className="h-14" aria-hidden />

      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
          boxShadow: scrolled ? '0 1px 8px rgba(0,0,0,0.08)' : 'none',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rotate-45 transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
              }}
            />
            <span
              className="text-lg font-bold tracking-tight transition-colors duration-300"
              style={{ color: scrolled ? '#1c1917' : '#ffffff' }}
            >
              GEM
            </span>
          </Link>

          {/* Desktop: links + CTA */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors no-underline"
                  style={{
                    color: scrolled ? '#57534e' : 'rgba(255,255,255,0.6)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = scrolled ? '#1c1917' : '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = scrolled ? '#57534e' : 'rgba(255,255,255,0.6)'
                  }}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              )
            })}

            <Link
              href="/login"
              className="ml-1 text-sm transition-colors no-underline"
              style={{ color: scrolled ? '#78716c' : 'rgba(255,255,255,0.5)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = scrolled ? '#1c1917' : '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = scrolled ? '#78716c' : 'rgba(255,255,255,0.5)'
              }}
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
                href="/dashboard"
                onClick={() => { try { trackEvent('cta_clicked', { location: 'nav', label: 'Get started free' }) } catch {} }}
                className="whitespace-nowrap inline-block px-5 py-2 rounded-full text-[13px] font-bold text-white no-underline transition-all hover:brightness-110"
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
                href="/dashboard"
                onClick={() => { try { trackEvent('cta_clicked', { location: 'nav_mobile', label: 'Get started free' }) } catch {} }}
                className="whitespace-nowrap inline-block px-4 py-1.5 rounded-full text-[12px] font-bold text-white no-underline"
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
              className="p-1.5 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
              style={{ color: scrolled ? '#1c1917' : '#ffffff' }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div
            className="md:hidden px-4 pb-4 pt-1"
            style={{
              background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(15,10,26,0.95)',
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
                  className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-[15px] font-medium no-underline transition-colors"
                  style={{ color: scrolled ? '#1c1917' : 'rgba(255,255,255,0.8)' }}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              )
            })}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-[15px] font-medium no-underline transition-colors"
              style={{ color: scrolled ? '#78716c' : 'rgba(255,255,255,0.5)' }}
            >
              Log in
            </Link>
          </div>
        )}
      </nav>
    </>
  )
}
