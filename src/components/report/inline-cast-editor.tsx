'use client'

// Renders cast character cards that switch to inline editable fields
// when the page-level edit context is active.

import { useEditContextOptional } from './edit-context'

interface Character {
  name: string
  role_type: string
  demographics: string
  hook: string
}

interface InlineCastEditorProps {
  /** Index of this character in the characters array */
  index: number
  character: Character
  /** Whether to blur the content (paywall) */
  blurred?: boolean
  /** Content to render in display (non-editing) mode */
  fallback?: React.ReactNode
}

export function InlineCastField({ index, character, blurred, fallback }: InlineCastEditorProps) {
  const editCtx = useEditContextOptional()
  const isEditing = editCtx?.isEditing ?? false

  // When editing, use context values; otherwise use the passed character
  const editChar = isEditing ? editCtx?.characters[index] : undefined
  const displayName = editChar?.name ?? character.name
  const displayHook = editChar?.hook ?? character.hook
  const displayDemographics = editChar?.demographics ?? character.demographics

  if (!isEditing) {
    // Display mode — render the fallback (usually the Collapsible)
    return <>{fallback}</>
  }

  // Edit mode — inline inputs replacing the Collapsible
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(124,77,237,0.25)',
      }}
    >
      {/* Name */}
      <div>
        <span className="block text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] mb-1">
          Character name
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => editCtx?.updateCharacter(index, 'name', e.target.value)}
          className="w-full text-[16px] font-semibold text-[var(--gem-gray-50)] bg-transparent outline-none border-b-2 border-purple-500/40 focus:border-purple-400 transition-colors pb-1"
          placeholder="Character name"
        />
      </div>
      {/* Demographics */}
      <div>
        <span className="block text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] mb-1">
          Demographics
        </span>
        <input
          type="text"
          value={displayDemographics}
          onChange={(e) => editCtx?.updateCharacter(index, 'demographics', e.target.value)}
          className="w-full text-[14px] text-[var(--gem-gray-200)] bg-transparent outline-none border-b-2 border-purple-500/40 focus:border-purple-400 transition-colors pb-1"
          placeholder="Age, gender, background"
        />
      </div>
      {/* Hook / Description */}
      <div>
        <span className="block text-[11px] uppercase tracking-[0.15em] font-bold text-[var(--gem-gray-500)] mb-1">
          Description
        </span>
        <textarea
          value={displayHook}
          onChange={(e) => editCtx?.updateCharacter(index, 'hook', e.target.value)}
          rows={3}
          className="w-full text-[15px] text-[var(--gem-gray-100)] leading-[1.6] bg-transparent outline-none border-b-2 border-purple-500/40 focus:border-purple-400 transition-colors resize-none"
          placeholder="What makes this character compelling"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--gem-gray-500)]">
          {character.role_type}
        </span>
      </div>
    </div>
  )
}
