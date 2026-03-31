import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PROJECT_STATUSES, MEDIUMS } from '@/lib/types'
import { User, Users, DollarSign, FolderOpen, MessageCircle, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, profiles(*), collaboration_roles(*, filler:profiles!collaboration_roles_filled_by_fkey(*))')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === project.creator_id

  const statusLabel = PROJECT_STATUSES.find(s => s.value === project.status)?.label || project.status
  const mediumLabel = MEDIUMS.find(m => m.value === project.medium)?.label || project.medium

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[var(--gem-gray-400)] mb-2">
          <span className="px-2 py-0.5 rounded-full border border-[var(--gem-gray-600)] text-[10px] uppercase tracking-wider">
            {statusLabel}
          </span>
          {mediumLabel && (
            <span className="flex items-center gap-1">
              <FolderOpen size={14} />
              {mediumLabel}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-3">{project.title}</h1>
        {project.profiles && (
          <Link
            href={`/creators/${project.creator_id}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-accent)] transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-[var(--gem-gray-700)] flex items-center justify-center text-[10px] font-bold text-[var(--gem-accent)] uppercase overflow-hidden">
              {project.profiles.avatar_url ? (
                <img src={project.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                project.profiles.full_name.charAt(0)
              )}
            </div>
            {project.profiles.full_name}
          </Link>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <div className="mb-8">
          <p className="text-[var(--gem-gray-200)] whitespace-pre-wrap leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Genre tags */}
      {project.genre?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-8">
          {project.genre.map((g: string) => (
            <span key={g} className="tag-pill">{g}</span>
          ))}
        </div>
      )}

      {/* Funding */}
      {project.funding_needed && (
        <div className="border border-[var(--gem-gray-700)] rounded-xl p-5 mb-8">
          <h2 className="flex items-center gap-2 text-sm font-medium mb-2">
            <DollarSign size={16} className="text-[var(--gem-warning)]" />
            Funding Needed
          </h2>
          <p className="text-sm text-[var(--gem-gray-300)]">{project.funding_needed}</p>
        </div>
      )}

      {/* Collaboration Roles */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-medium mb-4">
          <Users size={16} className="text-[var(--gem-accent)]" />
          Collaboration Roles
        </h2>

        {project.collaboration_roles?.length > 0 ? (
          <div className="space-y-3">
            {project.collaboration_roles.map((role: any) => (
              <div
                key={role.id}
                className={`border rounded-xl p-4 ${
                  role.filled_by
                    ? 'border-[var(--gem-gray-700)] opacity-70'
                    : 'border-[var(--gem-accent)]/30 bg-[var(--gem-accent)]/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium">{role.title}</h3>
                  {role.filled_by ? (
                    <span className="flex items-center gap-1 text-xs text-[var(--gem-success)]">
                      <CheckCircle size={12} />
                      Filled
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--gem-accent)]">Open</span>
                  )}
                </div>
                {role.description && (
                  <p className="text-sm text-[var(--gem-gray-400)] mb-2">{role.description}</p>
                )}
                {role.skills_needed?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {role.skills_needed.map((s: string) => (
                      <span key={s} className="tag-pill text-[10px]">{s}</span>
                    ))}
                  </div>
                )}
                {role.filler && (
                  <Link
                    href={`/creators/${role.filler.id}`}
                    className="flex items-center gap-2 mt-2 text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-accent)]"
                  >
                    <User size={12} />
                    {role.filler.full_name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--gem-gray-400)]">No collaboration roles defined yet.</p>
        )}
      </div>

      {/* Action buttons */}
      {!isOwner && user && (
        <div className="border-t border-[var(--gem-gray-700)] pt-6">
          <Link
            href={`/messages?to=${project.creator_id}&project=${project.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--gem-accent)] text-white text-sm hover:bg-[var(--gem-accent-hover)] transition-colors"
          >
            <MessageCircle size={16} />
            Message {project.profiles?.full_name} about this project
          </Link>
        </div>
      )}
    </div>
  )
}
