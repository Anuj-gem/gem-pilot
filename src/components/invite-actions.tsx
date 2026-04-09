'use client'

import { acceptInvite, declineInvite } from '@/app/discover/actions'

export default function InviteActions({ inviteId }: { inviteId: string }) {
  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => acceptInvite(inviteId)}
        className="px-3 py-1 rounded-lg bg-[var(--gem-accent)] text-white text-xs hover:bg-[var(--gem-accent-hover)]"
      >
        Accept
      </button>
      <button
        onClick={() => declineInvite(inviteId)}
        className="px-3 py-1 rounded-lg border border-[var(--gem-gray-600)] text-[var(--gem-gray-400)] text-xs hover:text-white"
      >
        Decline
      </button>
    </div>
  )
}
