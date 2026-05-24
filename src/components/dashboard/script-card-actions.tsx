'use client'

import React from 'react'

export function ScriptCardActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1 shrink-0"
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </div>
  )
}
