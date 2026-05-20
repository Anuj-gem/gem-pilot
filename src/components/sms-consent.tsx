'use client'

import Link from 'next/link'

interface SmsConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function SmsConsent({ checked, onChange }: SmsConsentProps) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[3px] h-3.5 w-3.5 rounded shrink-0 accent-[var(--gem-accent,#7c3aed)]"
      />
      <span className="text-[10px] leading-[1.5] text-current opacity-50">
        I agree to receive text updates from GEM. Msg &amp; data rates may
        apply. Msg frequency varies. Reply HELP for help, STOP to cancel.{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
      </span>
    </label>
  )
}
