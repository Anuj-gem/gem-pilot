// /w/[handle]/following — disabled. Redirect to home.
import { redirect } from 'next/navigation'
export default function FollowingPage() { redirect('/') }
