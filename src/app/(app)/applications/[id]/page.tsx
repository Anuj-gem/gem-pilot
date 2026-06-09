// Retired. The /applications/[id] detail page is no longer used — feedback now
// lives on the report page. Any visit here redirects to the dashboard.
import { redirect } from 'next/navigation'

export default function ApplicationDetailRedirect() {
  redirect('/dashboard')
}
