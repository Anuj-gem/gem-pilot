// /w/[handle] — public writer profile (disabled).
// Handles are no longer used. Redirect to home.

import { redirect } from 'next/navigation'

export default function PublicProfile() {
  redirect('/')
}
