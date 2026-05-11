// /evaluating — post-upload loading screen.
// Shows progress bar while eval runs, then signup prompt.
// Anonymous-friendly — no auth required.

import { EvaluatingClient } from './evaluating-client'
import Nav from '@/components/nav'

export const dynamic = 'force-dynamic'

export default function EvaluatingPage() {
  return (
    <div className="min-h-screen bg-[var(--gem-black)]">
      <Nav />
      <EvaluatingClient />
    </div>
  )
}
