import { createClient } from '@/lib/supabase-server'
import ProjectCard from '@/components/project-card'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, profiles(*), collaboration_roles(*)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-[var(--gem-gray-400)] mt-1">Browse all projects looking for collaborators</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-sm hover:bg-[var(--gem-accent-hover)] transition-colors"
        >
          <Plus size={16} />
          New Project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-[var(--gem-gray-400)]">
          <p className="mb-4">No projects yet. Be the first to post one.</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-sm"
          >
            <Plus size={16} />
            Create project
          </Link>
        </div>
      )}
    </div>
  )
}
