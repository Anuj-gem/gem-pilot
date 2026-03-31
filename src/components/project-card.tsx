import Link from 'next/link'
import { Project, PROJECT_STATUSES } from '@/lib/types'
import { FolderOpen, User, Users } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  showCreator?: boolean
}

export default function ProjectCard({ project, showCreator = true }: ProjectCardProps) {
  const statusLabel = PROJECT_STATUSES.find(s => s.value === project.status)?.label || project.status
  const openRoles = project.collaboration_roles?.filter(r => !r.filled_by).length || 0

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block border border-[var(--gem-gray-700)] rounded-xl p-5 hover:border-[var(--gem-gray-500)] transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white group-hover:text-[var(--gem-accent)] transition-colors truncate">
            {project.title}
          </h3>
          {showCreator && project.profiles && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--gem-gray-400)]">
              <User size={12} />
              {project.profiles.full_name}
            </div>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--gem-gray-600)] text-[var(--gem-gray-400)] whitespace-nowrap">
          {statusLabel}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-[var(--gem-gray-300)] line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-[var(--gem-gray-400)]">
        {project.medium && (
          <span className="flex items-center gap-1">
            <FolderOpen size={12} />
            {project.medium.replace(/_/g, ' ')}
          </span>
        )}
        {openRoles > 0 && (
          <span className="flex items-center gap-1 text-[var(--gem-accent)]">
            <Users size={12} />
            {openRoles} role{openRoles !== 1 ? 's' : ''} open
          </span>
        )}
      </div>

      {project.genre && project.genre.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {project.genre.slice(0, 4).map(g => (
            <span key={g} className="tag-pill text-[10px]">{g}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
