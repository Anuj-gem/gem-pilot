// /leaderboard — redirects to /discover (canonical URL as of 2026-06-03).
import { redirect } from 'next/navigation'
export default function LeaderboardRedirect() {
  redirect('/discover')
}
