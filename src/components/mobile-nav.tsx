'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X, Plus, Compass, LogIn, UserPlus } from 'lucide-react'

/**
 * Landing-page mobile nav.
 *
 * Two pieces, both always rendered on mobile:
 *   1. Submit pill — purple CTA. On landing it slides in only AFTER the hero
 *      upload/CTA scrolls out of view, so it doesn't compete with the bigger
 *      action immediately above it. Watches for an element with id
 *      "landing-hero-cta-anchor" via IntersectionObserver.
 *   2. Hamburger — opens a small floating panel with Industry / Sign Up /
 *      Log In as designed pill rows (not flat text).
 *
 * The hamburger menu intentionally OMITS Submit — Submit is its own
 * persistent button, not a menu item. Keeps the visual hierarchy clear.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const [submitVisible, setSubmitVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const anchor = document.getElementById('landing-hero-cta-anchor')
    if (!anchor) {
      // No anchor present (we're not on landing) → show submit immediately.
      setSubmitVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setSubmitVisible(!e.isIntersecting)
      },
      { threshold: 0 }
    )
    obs.observe(anchor)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="sm:hidden flex items-center gap-2">
      {/* Submit pill — animated pop-in once hero CTAs leave viewport */}
      <Link
        href="/submit"
        aria-label="Submit a script"
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-300"
        style={{
          background: 'var(--gem-accent)',
          opacity: submitVisible ? 1 : 0,
          transform: submitVisible ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.92)',
          pointerEvents: submitVisible ? 'auto' : 'none',
          boxShadow: submitVisible ? '0 4px 12px rgba(124,58,237,0.30)' : 'none',
        }}
      >
        <Plus size={13} />
        Submit
      </Link>

      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)] shadow-lg z-50">
          <div className="px-4 py-3 flex flex-col gap-2">
            <MenuRow
              href="/discover"
              onClick={() => setOpen(false)}
              icon={<Compass size={15} />}
              label="Industry"
              hint="Discover qualified scripts"
            />
            <MenuRow
              href="/signup"
              onClick={() => setOpen(false)}
              icon={<UserPlus size={15} />}
              label="Sign Up"
              hint="Free first read"
            />
            <MenuRow
              href="/login"
              onClick={() => setOpen(false)}
              icon={<LogIn size={15} />}
              label="Log In"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Designed menu row — icon left, label + optional hint stacked. Distinct from
// the Submit pill so the Submit CTA stays visually unique.
function MenuRow({
  href,
  onClick,
  icon,
  label,
  hint,
}: {
  href: string
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint?: string
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors hover:bg-[var(--gem-gray-900)]"
      style={{
        border: '1px solid var(--gem-gray-700)',
        background: 'var(--gem-gray-900)',
      }}
    >
      <span
        className="flex-shrink-0 w-7 h-7 rounded-md grid place-items-center text-[var(--gem-gray-300)]"
        style={{ background: 'var(--gem-gray-800)' }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold text-[var(--gem-gray-50)] leading-tight">
          {label}
        </span>
        {hint && (
          <span className="block text-[11.5px] text-[var(--gem-gray-500)] mt-0.5 leading-tight">
            {hint}
          </span>
        )}
      </span>
    </Link>
  )
}
