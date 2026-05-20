'use client'

import Link from 'next/link'

interface SmsConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function SmsConsent({ checked, onChange }: SmsConsentProps) {
  return (
    <label className="flex items-start gap-2 w-full cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 14, minWidth: 14, height: 14, background: 'transparent' }}
        className="mt-[3px] rounded shrink-0 accent-[var(--gem-accent,#7c3aed)]"
      />
      <span className="text-[10px] leading-[1.5] text-current opacity-50 min-w-0">
        We&apos;ll send you updates on your script evaluations and industry opportunities. Msg &amp; data rates may
        apply. Msg frequency varies. Reply HELP for help, STOP to cancel.{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
      </span>
    </label>
  )
}
