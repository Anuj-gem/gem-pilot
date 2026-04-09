import Link from 'next/link'
import { Profile } from '@/lib/types'

interface CreatorCardProps {
  profile: Profile
}

export default function CreatorCard({ profile }: CreatorCardProps) {
  return (
    <Link
      href={`/creators/${profile.id}`}
      className="block border border-[var(--gem-gray-700)] rounded-xl p-5 hover:border-[var(--gem-gray-500)] transition-colors group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[var(--gem-gray-700)] flex items-center justify-center text-sm font-bold text-[var(--gem-accent)] uppercase overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            profile.full_name.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-white group-hover:text-[var(--gem-accent)] transition-colors truncate">
            {profile.full_name}
          </h3>
          {profile.location && (
            <p className="text-xs text-[var(--gem-gray-400)]">{profile.location}</p>
          )}
        </div>
      </div>

      {profile.statement && (
        <p className="text-sm text-[var(--gem-gray-300)] line-clamp-2 mb-3 italic">
          &ldquo;{profile.statement}&rdquo;
        </p>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.skills.slice(0, 5).map(s => (
            <span key={s} className="tag-pill text-[10px]">{s}</span>
          ))}
          {profile.skills.length > 5 && (
            <span className="text-[10px] text-[var(--gem-gray-400)]">+{profile.skills.length - 5}</span>
          )}
        </div>
      )}
    </Link>
  )
}
