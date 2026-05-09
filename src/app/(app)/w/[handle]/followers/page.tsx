// /w/[handle]/followers — disabled. Redirect to home.
import { redirect } from 'next/navigation'
export default function FollowersPage() { redirect('/') }
