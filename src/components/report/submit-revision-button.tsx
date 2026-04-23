'use client'

// Owner-only "Submit revision" pill. Pro writers route straight to /submit
// with the format pre-filled so they skip the format step. Free writers
// trigger the upgrade modal — revisions count as a 2nd+ eval and need Pro.

import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { trackSubscribeClick } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

export function SubmitRevisionButton({
  isSubscribed,
  declaredFormat,
}: {
  isSubscribed: boolean
  declaredFormat?: string | null
}) {
  const router = useRouter()

  function handleClick() {
    if (isSubscribed) {
      const fmt = declaredFormat ? `?format=${encodeURIComponent(declaredFormat)}` : ''
      router.push(`/submit${fmt}`)
      return
    }
    trackSubscribeClick('submit_revision_locked')
    gtagSubscribeClicked()
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        isSubscribed
          ? 'Submit a new revision of this script'
          : 'Pro unlocks unlimited revisions'
      }
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
      style={{
        background: isSubscribed ? 'var(--gem-accent)' : 'transparent',
        color: isSubscribed ? '#fff' : 'var(--gem-gray-300)',
        border: isSubscribed ? 'none' : '1px solid var(--gem-gray-700)',
      }}
    >
      <RefreshCw size={12} />
      Submit revision
    </button>
  )
}
