'use client'

// Wraps the editable portions of the report page in the EditProvider
// context and renders the StickySaveBar. This is a client component so
// it can hold state; the server page passes data as props.

import { EditProvider, type CharacterEdit } from './edit-context'
import { StickySaveBar } from './sticky-save-bar'
import type { TopCardDisplay } from '@/lib/edited-fields'

interface EditWrapperProps {
  evaluationId: string
  submissionId: string
  initial: TopCardDisplay
  initialCharacters: CharacterEdit[]
  isOwner: boolean
  children: React.ReactNode
}

export function EditWrapper({
  evaluationId,
  submissionId,
  initial,
  initialCharacters,
  isOwner,
  children,
}: EditWrapperProps) {
  if (!isOwner) {
    return <>{children}</>
  }

  return (
    <EditProvider
      evaluationId={evaluationId}
      submissionId={submissionId}
      initial={initial}
      initialCharacters={initialCharacters}
    >
      {children}
      <StickySaveBar />
    </EditProvider>
  )
}
