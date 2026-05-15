// /dashboard — redirects to /home (the new unified app shell).
// All old /dashboard links throughout the app land here and bounce.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  redirect('/home')
}
