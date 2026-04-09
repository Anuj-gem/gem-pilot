'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function acceptInvite(inviteId: string) {
  const supabase = await createClient()
  await supabase.from('invites').update({ status: 'accepted' }).eq('id', inviteId)
  revalidatePath('/discover')
}

export async function declineInvite(inviteId: string) {
  const supabase = await createClient()
  await supabase.from('invites').update({ status: 'declined' }).eq('id', inviteId)
  revalidatePath('/discover')
}
