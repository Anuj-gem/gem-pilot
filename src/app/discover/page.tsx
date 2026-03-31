import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import ProjectCard from '@/components/project-card'
import CreatorCard from '@/components/creator-card'
import InviteActions from '@/components/invite-actions'
import { Sparkles, ArrowRight, Users, Send } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Activity feed — recent projects and creators
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('*, profiles(*), collaboration_roles(*)')
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: recentCreators } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  // Recommended collaborations (if logged in)
  let recommendations: any[] = []
  let incomingInvites: any[] = []

  if (user) {
    const { data: recs } = await supabase.rpc('get_recommended_collaborators', {
      for_user_id: user.id,
    })
    recommendations = recs || []

    const { data: invites } = await supabase
      .from('invites')
      .select('*, from_profile:profiles!invites_from_id_fkey(*), project:projects(*), role:collaboration_roles(*)')
      .eq('to_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    incomingInvites = invites || []
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Discover</h1>
          <p className="text-sm text-[var(--gem-gray-400)] mt-1">Find creators, projects, and collaboration opportunities</p>
        </div>
        <Link
          href="/discover/search"
          className="text-sm text-[var(--gem-accent)] hover:underline"
        >
          Search
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main column — Activity Feed */}
        <div className="lg:col-span-2 space-y-10">
          {/* Incoming invites */}
          {incomingInvites.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-[var(--gem-gray-400)] mb-4">
                <Send size={14} className="text-[var(--gem-accent)]" />
                Collaboration Invites
              </h2>
              <div className="space-y-3">
                {incomingInvites.map((invite: any) => (
                  <div key={invite.id} className="border border-[var(--gem-accent)]/30 bg-[var(--gem-accent)]/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Link href={`/creators/${invite.from_id}`} className="font-medium text-sm hover:text-[var(--gem-accent)]">
                        {invite.from_profile?.full_name}
                      </Link>
                      <span className="text-xs text-[var(--gem-gray-400)]">invited you to collaborate on</span>
                      <Link href={`/projects/${invite.project_id}`} className="font-medium text-sm hover:text-[var(--gem-accent)]">
                        {invite.project?.title}
                      </Link>
                    </div>
                    {invite.role && (
                      <p className="text-xs text-[var(--gem-gray-400)]">Role: {invite.role.title}</p>
                    )}
                    {invite.message && (
                      <p className="text-sm text-[var(--gem-gray-300)] mt-2">{invite.message}</p>
                    )}
                    <InviteActions inviteId={invite.id} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommended collaborations */}
          {recommendations.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-[var(--gem-gray-400)] mb-4">
                <Sparkles size={14} className="text-[var(--gem-accent)]" />
                Recommended For You
              </h2>
              <div className="space-y-3">
                {recommendations.map((rec: any, i: number) => (
                  <Link
                    key={i}
                    href={`/projects/${rec.project_id}`}
                    className="block border border-[var(--gem-gray-700)] rounded-xl p-4 hover:border-[var(--gem-gray-500)] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={14} className="text-[var(--gem-accent)]" />
                      <span className="font-medium text-sm">{rec.role_title}</span>
                      <span className="text-xs text-[var(--gem-gray-400)]">on</span>
                      <span className="text-sm">{rec.project_title}</span>
                    </div>
                    <p className="text-xs text-[var(--gem-gray-400)]">
                      by {rec.creator_name} — {rec.match_reason}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recent projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--gem-gray-400)]">
                Recent Projects
              </h2>
              <Link href="/projects" className="flex items-center gap-1 text-xs text-[var(--gem-accent)] hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {recentProjects && recentProjects.length > 0 ? (
              <div className="grid gap-4">
                {recentProjects.map(p => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--gem-gray-400)] py-8 text-center">No projects yet. Be the first to post one.</p>
            )}
          </section>
        </div>

        {/* Sidebar — New Creators */}
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--gem-gray-400)] mb-4">
            New Creators
          </h2>
          {recentCreators && recentCreators.length > 0 ? (
            <div className="space-y-3">
              {recentCreators.map(c => (
                <CreatorCard key={c.id} profile={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--gem-gray-400)] py-8 text-center">No creators yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
