'use client'

// InlineEditable — owner-only click-to-edit for a single report field.
//
// Renders as plain text. On click (owner only) it becomes an auto-growing
// textarea styled to match the surrounding copy — no box, just a subtle
// underline on hover/focus. Saves itself to /api/evaluations/[id]/edit on
// blur, but ONLY when the value actually changed. The edit endpoint merges
// partial edited_fields, so saving a single key never disturbs the others.
//
// Empty is allowed for clearable fields (logline/pitch/summary). The title
// field is non-clearable: an empty value reverts to the last saved value.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  evaluationId: string
  /** The edit-endpoint field key, e.g. 'title' | 'logline' | 'elevator_pitch' | 'plot_summary' */
  field: 'title' | 'logline' | 'elevator_pitch' | 'plot_summary'
  /** Current saved value (what renders when not editing) */
  value: string
  /** Whether the current viewer owns this script */
  isOwner: boolean
  /** Tailwind/className for the rendered text (matches surrounding copy) */
  className?: string
  /** Inline style for the rendered text */
  style?: React.CSSProperties
  /** Render as a heading element instead of a paragraph (title) */
  as?: 'p' | 'h1' | 'div'
  /** Placeholder shown (owner only) when empty */
  placeholder?: string
  /** If true, an empty value is reverted instead of saved (title) */
  required?: boolean
}

export function InlineEditable({
  evaluationId,
  field,
  value,
  isOwner,
  className,
  style,
  as = 'p',
  placeholder = 'Click to add…',
  required = false,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const [saving, setSaving] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const savedRef = useRef(value)

  // Keep local state in sync if the server value changes (e.g. after refresh)
  useEffect(() => {
    setVal(value)
    savedRef.current = value
  }, [value])

  // Auto-grow the textarea to fit content
  const grow = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }
  useLayoutEffect(() => {
    if (editing) {
      grow()
      const ta = taRef.current
      if (ta) {
        ta.focus()
        // place caret at end
        const len = ta.value.length
        ta.setSelectionRange(len, len)
      }
    }
  }, [editing])

  if (!isOwner) {
    if (!value) return null
    const Tag = as
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    )
  }

  async function commit() {
    const trimmed = val.trim()
    const prev = savedRef.current.trim()
    setEditing(false)

    // Required field can't be cleared — revert.
    if (required && !trimmed) {
      setVal(savedRef.current)
      return
    }
    // No change — nothing to save.
    if (trimmed === prev) {
      setVal(savedRef.current)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: trimmed }),
      })
      if (!res.ok) throw new Error(String(res.status))
      savedRef.current = trimmed
      setVal(trimmed)
      router.refresh()
    } catch {
      // revert on failure
      setVal(savedRef.current)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <textarea
        ref={taRef}
        value={val}
        disabled={saving}
        onChange={(e) => {
          setVal(e.target.value)
          grow()
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          // Esc cancels; Enter on a single-line field (title) commits.
          if (e.key === 'Escape') {
            e.preventDefault()
            setVal(savedRef.current)
            setEditing(false)
          } else if (e.key === 'Enter' && as !== 'p') {
            e.preventDefault()
            taRef.current?.blur()
          }
        }}
        rows={1}
        className={className}
        style={{
          ...style,
          width: '100%',
          display: 'block',
          resize: 'none',
          overflow: 'hidden',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
          boxShadow: 'inset 0 -1px 0 rgba(124,58,237,0.55)',
          font: 'inherit',
        }}
      />
    )
  }

  const Tag = as
  const isEmpty = !val
  return (
    <Tag
      className={className}
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        ...style,
        cursor: 'text',
        boxShadow: 'inset 0 -1px 0 transparent',
        transition: 'box-shadow 120ms ease',
        opacity: saving ? 0.55 : 1,
        ...(isEmpty ? { color: '#A8A29E' } : null),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'inset 0 -1px 0 rgba(124,58,237,0.35)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'inset 0 -1px 0 transparent'
      }}
    >
      {isEmpty ? placeholder : val}
    </Tag>
  )
}
