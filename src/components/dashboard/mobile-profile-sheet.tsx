'use client'

// MobileProfileSheet — slide-up panel triggered by the Profile tab in
// MobileTabBar. Shows profile info for logged-in users and a signup CTA
// for anonymous users. Contains all the functionality from the desktop
// sidebar so nothing is lost on mobile.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { X, FileText, Briefcase, Pencil, LogOut, Crown } from 'lucide-react'

export interface MobileProfileSheetProps {
  open: boolean
  onClose: () => void
  isAnon: boolean
  userName?: string
  avatarUrl?: string | null
  headline?: string | null
  isPro?: boolean
  heatScore?: number
}

export function MobileProfileSheet({
  open,
  onClose,
  isAnon,
  userName,
  avatarUrl,
  headline,
  isPro,
  heatScore,
}: MobileProfileSheetProps) {
  const router = useRouter()
  const supabase = createClient()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    onClose()
    router.push('/')
    router.refresh()
  }

  function handleSignupGate() {
    onClose()
    window.dispatchEvent(new CustomEvent('gem:open-signup-gate', {
      detail: { contextMessage: 'Create an account to save your scripts, post to the leaderboard, and apply for opportunities.' },
    }))
  }

  function handleUpgrade() {
    onClose()
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors border-0 cursor-pointer bg-transparent"
        >
          <X size={16} />
        </button>

        <div className="px-5 pb-5 pt-2">
          {isAnon ? (
            /* ── Anonymous state ── */
            <div>
              {/* Empty avatar */}
              <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ border: '1.5px dashed rgba(0,0,0,0.15)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>

              <p className="text-[15px] font-semibold text-gray-900 text-center m-0 mb-1">Your writer profile</p>
              <p className="text-[12px] text-gray-400 text-center m-0 mb-5">Create an account to save your work</p>

              <button
                onClick={handleSignupGate}
                className="w-full py-3 rounded-xl text-[14px] font-semibold text-white cursor-pointer border-0 transition-all hover:brightness-110 mb-3"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                Create your profile
              </button>

              <Link
                href="/login"
                onClick={onClose}
                className="block text-center text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
              >
                Already have an account? Log in
              </Link>
            </div>
          ) : (
            /* ── Logged-in state ── */
            <div>
              {/* Avatar + name + badge */}
              <div className="flex items-center gap-3 mb-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-semibold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                  >
                    {(userName || 'W').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-gray-900 m-0 truncate">{userName || 'Writer'}</p>
                  {headline && (
                    <p className="text-[12px] text-gray-500 m-0 truncate">{headline}</p>
                  )}
                  <span
                    className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: isPro ? '#f5f3ff' : '#f9fafb',
                      color: isPro ? '#7c3aed' : '#9ca3af',
                    }}
                  >
                    {isPro ? 'Member' : 'Guest'}
                  </span>
                </div>
                {typeof heatScore === 'number' && heatScore > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0"
                    style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <span className="text-[12px]">🔥</span>
                    <span className="text-[14px] font-bold text-orange-600">{heatScore}</span>
                  </div>
                )}
              </div>

              {/* Become a member CTA */}
              {!isPro && (
                <button
                  onClick={handleUpgrade}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white cursor-pointer border-0 transition-all hover:brightness-110 mb-3"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                >
                  <Crown size={14} />
                  Become a member
                </button>
              )}

              {/* Links */}
              <div className="space-y-1">
                <SheetLink href="/scripts" icon={<FileText size={16} />} label="My Scripts" onClick={onClose} />
                <SheetLink href="/review" icon={<Briefcase size={16} />} label="My Applications" onClick={onClose} />
                <SheetLink href="/profile" icon={<Pencil size={16} />} label="Edit profile" onClick={onClose} />
              </div>

              {/* Sign out */}
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-0 bg-transparent cursor-pointer disabled:opacity-50"
                >
                  <LogOut size={16} />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function SheetLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-400">{icon}</span>
      {label}
    </Link>
  )
}
