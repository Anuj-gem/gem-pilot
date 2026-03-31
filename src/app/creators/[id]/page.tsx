import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProjectCard from '@/components/project-card'
import { MapPin, Globe, Pencil, MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, collaboration_roles(*)')
    .eq('creator_id', id)
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()
  const isOwn = user?.id === id

  // Get projects where this creator is a collaborator
  const { data: collabRoles } = await supabase
    .from('collaboration_roles')
    .select('*, project:projects(*, profiles(*))')
    .eq('filled_by', id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-[var(--gem-gray-700)] flex items-center justify-center text-2xl font-bold text-[var(--gem-accent)] uppercase shrink-0 overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            profile.full_name.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            {isOwn && (
              <Link
                href="/profile/edit"
                className="p-1.5 rounded-lg text-[var(--gem-gray-400)] hover:text-white hover:bg-[var(--gem-gray-800)] transition-colors"
                title="Edit profile"
              >
                <Pencil size={16} />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--gem-gray-400)]">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin size={14} />{profile.location}</span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-[var(--gem-accent)]">
                <Globe size={14} />Website
              </a>
            )}
          </div>
        </div>
        {!isOwn && user && (
          <Link
            href={`/messages?to=${id}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-sm hover:bg-[var(--gem-accent-hover)] transition-colors shrink-0"
          >
            <MessageCircle size={14} />
            Message
          </Link>
        )}
      </div>

      {/* Statement */}
      {profile.statement && (
        <blockquote className="border-l-2 border-[var(--gem-accent)] pl-4 mb-8 text-[var(--gem-gray-200)] italic">
          {profile.statement}
        </blockquote>
      )}

      {/* Skills & Genres */}
      <div className="flex flex-wrap gap-4 mb-8">
        {profile.skills?.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[var(--gem-gray-500)] mb-2">Skills</h3>
            <div className="flex flex-wrap gap-1">
              {profile.skills.map((s: string) => (
                <span key={s} className="tag-pill">{s}</span>
              ))}
            </div>
          </div>
        )}
        {profile.genres?.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[var(--gem-gray-500)] mb-2">Genres</h3>
            <div className="flex flex-wrap gap-1">
              {profile.genres.map((g: string) => (
                <span key={g} className="tag-pill">{g}</span>
              ))}
            </div>
          </div>
        )}
        {profile.influences?.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[var(--gem-gray-500)] mb-2">Influences</h3>
            <div className="flex flex-wrap gap-1">
              {profile.influences.map((i: string) => (
                <span key={i} className="tag-pill">{i}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Accomplishments */}
      {profile.accomplishments && (
        <div className="mb-10">
          <h2 className="text-xs uppercase tracking-wider text-[var(--gem-gray-500)] mb-3">Work &amp; Accomplishments</h2>
          <p className="text-sm text-[var(--gem-gray-300)] whitespace-pre-wrap">{profile.accomplishments}</p>
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs uppercase tracking-wider text-[var(--gem-gray-500)] mb-4">Projects</h2>
          <div className="grid gap-4">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} showCreator={false} />
            ))}
          </div>
        </div>
      )}

      {/* Collaborations */}
      {collabRoles && collabRoles.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-wider text-[var(--gem-gray-500)] mb-4">Collaborations</h2>
          <div className="grid gap-4">
            {collabRoles.map((cr: any) => cr.project && (
              <ProjectCard key={cr.id} project={cr.project} />
            ))}
          </div>
        </div>
      )}

      {isOwn && (!projects || projects.length === 0) && (
        <div className="text-center py-16 border border-dashed border-[var(--gem-gray-700)] rounded-xl">
          <p className="text-[var(--gem-gray-400)] mb-4">You haven&apos;t posted any projects yet.</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-sm hover:bg-[var(--gem-accent-hover)] transition-colors"
          >
            Create your first project
          </Link>
        </div>
      )}
    </div>
  )
}
