'use client'

import { useState, type ReactNode } from 'react'
import { PaywallModal } from '@/components/ui/paywall-modal'

interface Props {
  children: ReactNode
  className?: string
  as?: 'button' | 'span' | 'div'
  ariaLabel?: string
}

/**
 * Click-to-unlock wrapper for free users on the dashboard.
 * Renders children (typically a blurred score / stat) and opens the PaywallModal on click.
 */
export function UnlockTrigger({ children, className, as = 'button', ariaLabel = 'Unlock your score' }: Props) {
  const [open, setOpen] = useState(false)
  const Tag = as as any

  return (
    <>
      <Tag
        type={as === 'button' ? 'button' : undefined}
        onClick={() => setOpen(true)}
        className={`cursor-pointer ${className ?? ''}`}
        aria-label={ariaLabel}
      >
        {children}
      </Tag>
      {open && <PaywallModal onClose={() => setOpen(false)} />}
    </>
  )
}
