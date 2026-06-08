'use client'

// InlineEditable — owner-only click-to-edit for a single report field.
//
// Renders the text inside its normal element (h1/p/div). For owners it's
// contentEditable, so editing happens in place with NO box — just a subtle
// underline on hover/focus. (A textarea can't be used here: a global
// `textarea { background:white !important }` rule would force a white box.)
//
// Saves to /api/evaluations/[id]/edit on blur, but ONLY when the value
// actually changed. The edit endpoint merges partial edited_fields, so
// saving a single key never disturbs the others. Empty is allowed for
// clearable fields; `required` fields (title) revert to the saved value.
//
// We deliberately keep NO React state that changes during typing (only a
// `saving` flag that flips after blur), so React never re-renders the
// element mid-edit and the caret never jumps.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  evaluationId: string
  field: 'title' | 'logline' | 'elevator_pitch' | 'plot_summary'
  value: string
  isOwner: boolean
  className?: string
  style?: React.CSSProperties
  as?: 'p' | 'h1' | 'div'
  placeholder?: string
  required?: boolean
}

const UNDERLINE_FOCUS = 'inset 0 -1px 0 rgba(124,58,237,0.55)'
const UNDERLINE_HOVER = 'inset 0 -1px 0 rgba(124,58,237,0.35)'
const UNDERLINE_NONE = 'inset 0 -1px 0 transparent'

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
  const ref = useRef<HTMLElement>(null)
  const savedRef = useRef(value)
  const [saving, setSaving] = useState(false)

  // Keep the DOM text in sync with the saved value when not actively editing.
  useEffect(() => {
    savedRef.current = value
    const el = ref.current
    if (el && document.activeElement !== el && el.textContent !== value) {
      el.textContent = value
    }
  }, [value])

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
    const el = ref.current
    if (!el) return
    el.style.boxShadow = UNDERLINE_NONE
    const trimmed = (el.textContent ?? '').trim()
    const prev = savedRef.current.trim()

    if ((required && !trimmed) || trimmed === prev) {
      el.textContent = savedRef.current // revert / normalize
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
      router.refresh()
    } catch {
      el.textContent = savedRef.current // revert on failure
    } finally {
      setSaving(false)
    }
  }

  const Tag = as as any

  return (
    <Tag
      ref={ref}
      className={className}
      contentEditable={!saving}
      suppressContentEditableWarning
      role="textbox"
      data-placeholder={placeholder}
      onFocus={(e: React.FocusEvent<HTMLElement>) => {
        e.currentTarget.style.boxShadow = UNDERLINE_FOCUS
      }}
      onBlur={() => commit()}
      onPaste={(e: React.ClipboardEvent) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          if (ref.current) ref.current.textContent = savedRef.current
          ;(e.target as HTMLElement).blur()
        } else if (e.key === 'Enter' && as !== 'p') {
          e.preventDefault()
          ;(e.target as HTMLElement).blur()
        }
      }}
      onMouseOver={(e: React.MouseEvent<HTMLElement>) => {
        if (!saving && document.activeElement !== e.currentTarget) {
          e.currentTarget.style.boxShadow = UNDERLINE_HOVER
        }
      }}
      onMouseOut={(e: React.MouseEvent<HTMLElement>) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.boxShadow = UNDERLINE_NONE
        }
      }}
      style={{
        ...style,
        cursor: 'text',
        outline: 'none',
        opacity: saving ? 0.55 : 1,
        boxShadow: UNDERLINE_NONE,
        transition: 'box-shadow 120ms ease',
        minHeight: '1em',
      }}
    >
      {value}
    </Tag>
  )
}
