'use client'

// Page-level inline edit context for the report page.
//
// When `isEditing` is true, all editable sections (top card, elevator
// pitch, plot summary, cast) switch their display elements to inline
// inputs. The sticky save bar appears at the bottom of the viewport.
//
// State lives here so it's shared across components. The save function
// collects all dirty values and posts them in one batch.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  canonicalizeGenre,
  LOCKED_GENRE_VOCAB,
  type TopCardDisplay,
} from '@/lib/edited-fields'

// ── Character edit shape ────────────────────────────────────────────
export interface CharacterEdit {
  name: string
  hook: string
  demographics: string
  role_type: string
}

// ── Context value ───────────────────────────────────────────────────
interface EditContextValue {
  isEditing: boolean
  startEditing: () => void
  cancelEditing: () => void
  saving: boolean

  // Top card fields
  title: string
  setTitle: (v: string) => void
  logline: string
  setLogline: (v: string) => void
  genrePrimary: string
  setGenrePrimary: (v: string) => void
  genreSecondary: string[]
  setGenreSecondary: (v: string[]) => void
  tone: string
  setTone: (v: string) => void
  tags: string[]
  setTags: (v: string[]) => void

  // Elevator pitch + plot summary
  elevatorPitch: string
  setElevatorPitch: (v: string) => void
  plotSummary: string
  setPlotSummary: (v: string) => void

  // Cast characters
  characters: CharacterEdit[]
  updateCharacter: (index: number, field: keyof CharacterEdit, value: string) => void

  // Save
  save: () => Promise<void>
  error: string | null
}

const EditContext = createContext<EditContextValue | null>(null)

export function useEditContext() {
  const ctx = useContext(EditContext)
  if (!ctx) throw new Error('useEditContext must be used inside EditProvider')
  return ctx
}

/** Optional — returns null when outside the provider (e.g. non-owner view). */
export function useEditContextOptional() {
  return useContext(EditContext)
}

// ── Provider ────────────────────────────────────────────────────────
interface EditProviderProps {
  evaluationId: string
  submissionId: string
  initial: TopCardDisplay
  initialCharacters: CharacterEdit[]
  initialElevatorPitch: string
  initialPlotSummary: string
  children: ReactNode
}

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags ?? []) {
    if (typeof t !== 'string') continue
    const v = t.trim().toLowerCase()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

export function EditProvider({
  evaluationId,
  submissionId,
  initial,
  initialCharacters,
  initialElevatorPitch,
  initialPlotSummary,
  children,
}: EditProviderProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Top card state
  const [title, setTitle] = useState(initial.title)
  const [logline, setLogline] = useState(initial.logline)
  const [genrePrimary, setGenrePrimary] = useState<string>(
    () => canonicalizeGenre(initial.genre_primary) ?? ''
  )
  const [genreSecondary, setGenreSecondary] = useState<string[]>(() =>
    initial.genre_secondary
      .map((g) => canonicalizeGenre(g))
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .slice(0, 2)
  )
  const [tone, setTone] = useState(initial.tone)
  const initialTagsList = useMemo(
    () => dedupeTags(initial.tags ?? []),
    [initial.tags]
  )
  const [tags, setTags] = useState<string[]>(() => initialTagsList)

  // Elevator pitch + plot summary
  const [elevatorPitch, setElevatorPitch] = useState(initialElevatorPitch)
  const [plotSummary, setPlotSummary] = useState(initialPlotSummary)

  // Cast state
  const [characters, setCharacters] = useState<CharacterEdit[]>(
    () => initialCharacters.map((c) => ({ ...c }))
  )

  const resetAll = useCallback(() => {
    setTitle(initial.title)
    setLogline(initial.logline)
    setGenrePrimary(canonicalizeGenre(initial.genre_primary) ?? '')
    setGenreSecondary(
      initial.genre_secondary
        .map((g) => canonicalizeGenre(g))
        .filter((g): g is NonNullable<typeof g> => g !== null)
        .slice(0, 2)
    )
    setTone(initial.tone)
    setTags(initialTagsList)
    setElevatorPitch(initialElevatorPitch)
    setPlotSummary(initialPlotSummary)
    setCharacters(initialCharacters.map((c) => ({ ...c })))
    setError(null)
  }, [initial, initialTagsList, initialCharacters, initialElevatorPitch, initialPlotSummary])

  const startEditing = useCallback(() => {
    resetAll()
    setIsEditing(true)
    setError(null)
  }, [resetAll])

  const cancelEditing = useCallback(() => {
    resetAll()
    setIsEditing(false)
  }, [resetAll])

  const updateCharacter = useCallback(
    (index: number, field: keyof CharacterEdit, value: string) => {
      setCharacters((prev) => {
        const next = [...prev]
        if (next[index]) {
          next[index] = { ...next[index], [field]: value }
        }
        return next
      })
    },
    []
  )

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)

    // Build eval-fields body
    const editBody: Record<string, any> = {
      title,
      logline,
      genre_primary: genrePrimary,
      tone,
      genre_secondary: genreSecondary.filter((t) => t.trim().length > 0).slice(0, 2),
      genre_tags: [],
    }

    // Elevator pitch
    if (elevatorPitch !== initialElevatorPitch) {
      editBody.elevator_pitch = elevatorPitch
    }

    // Plot summary
    if (plotSummary !== initialPlotSummary) {
      editBody.plot_summary = plotSummary
    }

    // Check if characters changed
    const charsChanged = characters.some(
      (c, i) =>
        !initialCharacters[i] ||
        c.name !== initialCharacters[i].name ||
        c.hook !== initialCharacters[i].hook ||
        c.demographics !== initialCharacters[i].demographics
    )
    if (charsChanged) {
      editBody.characters = characters.map((c) => ({
        name: c.name,
        hook: c.hook,
        demographics: c.demographics,
        role_type: c.role_type,
      }))
    }

    // Check if tags changed
    const cleanedTags = dedupeTags(tags)
    const tagsChanged =
      cleanedTags.length !== initialTagsList.length ||
      cleanedTags.some((t, i) => t !== initialTagsList[i])

    try {
      const [editRes, tagsRes] = await Promise.all([
        fetch(`/api/evaluations/${evaluationId}/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editBody),
        }),
        tagsChanged
          ? fetch(`/api/scripts/${encodeURIComponent(submissionId)}/tags`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tags: cleanedTags }),
            })
          : Promise.resolve(null),
      ])

      if (!editRes.ok) {
        const j = await editRes.json().catch(() => ({}))
        setError(j?.error ?? `Save failed (${editRes.status})`)
        setSaving(false)
        return
      }
      if (tagsRes && !tagsRes.ok) {
        const j = await tagsRes.json().catch(() => ({}))
        setError(j?.error ?? `Tags save failed (${tagsRes.status})`)
        setSaving(false)
        return
      }

      setIsEditing(false)
      setSaving(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
      setSaving(false)
    }
  }, [
    title, logline, genrePrimary, genreSecondary, tone, tags,
    elevatorPitch, plotSummary,
    initialElevatorPitch, initialPlotSummary,
    characters, initialCharacters, initialTagsList,
    evaluationId, submissionId, router,
  ])

  const value = useMemo<EditContextValue>(
    () => ({
      isEditing,
      startEditing,
      cancelEditing,
      saving,
      title, setTitle,
      logline, setLogline,
      genrePrimary, setGenrePrimary,
      genreSecondary, setGenreSecondary,
      tone, setTone,
      tags, setTags,
      elevatorPitch, setElevatorPitch,
      plotSummary, setPlotSummary,
      characters,
      updateCharacter,
      save,
      error,
    }),
    [
      isEditing, startEditing, cancelEditing, saving,
      title, logline, genrePrimary, genreSecondary, tone, tags,
      elevatorPitch, plotSummary,
      characters, updateCharacter, save, error,
    ]
  )

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>
}
