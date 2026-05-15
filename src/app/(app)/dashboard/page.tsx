// /dashboard — redirects to /script (the main app page).
// All old /dashboard links throughout the app land here and bounce.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  redirect('/submit')
}
