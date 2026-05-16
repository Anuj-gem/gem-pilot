'use client'

// ApplyButton — client component for opportunity card Apply action.
// When anonymous, fires signup gate modal instead of navigating.

import Link from 'next/link'

type Props = {
  href: string
  isAnon?: boolean
}

export function ApplyButton({ href, isAnon }: Props) {
  if (isAnon) {
    return (
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('gem:open-signup-gate', {
            detail: { contextMessage: 'Create an account to save your scripts, post to the leaderboard, and apply for opportunities.' },
          }))
        }}
        className="text-[13px] font-semibold text-white px-3.5 py-1 rounded-lg transition-all hover:brightness-110 border-0 cursor-pointer"
        style={{ background: '#7c3aed' }}
      >
        Apply
      </button>
    )
  }

  return (
    <Link href={`${href}/apply`}
      className="text-[13px] font-semibold text-white px-3.5 py-1 rounded-lg transition-all hover:brightness-110"
      style={{ background: '#7c3aed' }}>
      Apply
    </Link>
  )
}
