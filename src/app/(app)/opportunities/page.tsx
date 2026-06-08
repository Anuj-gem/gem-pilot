// /opportunities — legacy URL. The partner page now lives at /partners.
import { redirect } from 'next/navigation'

export default function OpportunitiesRedirect() {
  redirect('/partners')
}
