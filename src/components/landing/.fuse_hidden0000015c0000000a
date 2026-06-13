// LandingNav — sticky nav for the landing page.
// White bg with dark text (matches the app nav). Once the hero CTA scrolls
// out of view, reveals an inline "Get started free" button.
// Mobile: nav links collapse into a hamburger menu.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

const NAV_LINKS = [
  { href: '/discover', label: 'Discover', emoji: '🔍' },
  { href: '/opportunities', label: 'Opportunities', emoji: '💼' },
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
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm transition-all duration-300"
        style={{
          borderBottom: '1px solid #E7E5E4',
          boxShadow: scrolled ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rotate-45"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
              }}
            />
            <span className="text-lg font-bold tracking-tight" style={{ color: '#1a1a1a' }}>
              GEM
            </span>
          </Link>

          {/* Desktop: links + CTA */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors"
                  style={{ color: '#78716C' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#1a1a1a' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#78716C' }}
                >
                  <span className="text-[15px] leading-none">{link.emoji}</span>
                  {link.label}
                </Link>
              ))}

            <Link
              href="/login"
              className="ml-1 px-3 py-1.5 text-sm font-medium no-underline transition-colors rounded-lg"
              style={{ color: '#78716C' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#1a1a1a' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#78716C' }}
            >
              Log in
            </Link>

            {/* CTA — slides in when hero CTA scrolls out */}
            <div
              className="ml-2 overflow-hidden transition-all duration-300"
              style={{
                maxWidth: scrolled ? '200px' : '0px',
                opacity: scrolled ? 1 : 0,
                transform: scrolled ? 'translateY(0)' : 'translateY(-8px)',
              }}
            >
              <Link
                href="/get-started"
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
              className="flex items-center justify-center w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
              style={{ color: '#1a1a1a' }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div
            className="md:hidden px-4 pb-4 pt-2"
            style={{
              background: '#110f1d',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-medium no-underline transition-colors"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <span className="text-[15px] leading-none">{link.emoji}</span>
                  {link.label}
                </Link>
              ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-medium no-underline transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Log in
            </Link>
            <Link
              href="/get-started"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center px-3 py-2.5 rounded-lg text-[14px] font-semibold text-white no-underline mt-1"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
            >
              Get started
            </Link>
          </div>
        )}
      </nav>
    </>
  )
}
