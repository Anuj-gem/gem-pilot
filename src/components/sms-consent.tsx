'use client'

import Link from 'next/link'

interface SmsConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function SmsConsent({ checked, onChange }: SmsConsentProps) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[var(--gem-accent,#7c3aed)] shrink-0"
      />
      <span className="text-[11px] leading-relaxed text-gray-500">
        <span className="font-medium text-gray-700">I would like to receive updates by text</span>
        <br />
        We&apos;ll be sending you updates from GEM. Message and data rates may
        apply. Message frequency varies. At any time you can text HELP for help
        or STOP to opt out.
        <br />
        <Link href="/privacy" className="underline text-gray-500 hover:text-gray-700">
          Privacy Policy
        </Link>
      </span>
    </label>
  )
}
