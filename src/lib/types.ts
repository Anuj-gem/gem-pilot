export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  statement: string | null
  bio: string | null
  skills: string[]
  genres: string[]
  influences: string[]
  website: string | null
  location: string | null
  accomplishments: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  creator_id: string
  title: string
  description: string | null
  medium: string | null
  genre: string[]
  status: string
  funding_needed: string | null
  materials_urls: string[]
  cover_image_url: string | null
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile
  collaboration_roles?: CollaborationRole[]
}

export interface CollaborationRole {
  id: string
  project_id: string
  title: string
  description: string | null
  skills_needed: string[]
  filled_by: string | null
  created_at: string
  // joined
  filler?: Profile
}

export interface Invite {
  id: string
  from_id: string
  to_id: string
  project_id: string
  role_id: string | null
  message: string | null
  status: string
  created_at: string
  // joined
  from_profile?: Profile
  to_profile?: Profile
  project?: Project
  role?: CollaborationRole
}

export interface Conversation {
  id: string
  created_at: string
  participants?: Profile[]
  last_message?: Message
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Profile
}

export interface ActivityItem {
  type: 'new_project' | 'new_creator'
  item_id: string
  title: string
  description: string | null
  actor_id: string
  actor_name: string
  actor_avatar: string | null
  created_at: string
}

export interface RecommendedCollaboration {
  project_id: string
  project_title: string
  role_id: string
  role_title: string
  creator_id: string
  creator_name: string
  creator_avatar: string | null
  match_reason: string
}

// Constants
export const SKILLS = [
  'writing', 'directing', 'cinematography', 'editing', 'sound-design',
  'composing', 'scoring', 'concept-art', 'world-building', 'vfx',
  'animation', 'prompt-engineering', 'producing', 'acting',
  'voice-acting', 'motion-capture', 'color-grading', 'storyboarding'
]

export const GENRES = [
  'horror', 'sci-fi', 'drama', 'comedy', 'thriller', 'action',
  'romance', 'documentary', 'animation', 'fantasy', 'mystery',
  'crime', 'western', 'musical', 'experimental', 'arthouse'
]

export const MEDIUMS = [
  { value: 'feature_film', label: 'Feature Film' },
  { value: 'short_film', label: 'Short Film' },
  { value: 'series', label: 'Series' },
  { value: 'limited_series', label: 'Limited Series' },
  { value: 'social_channel', label: 'Social Channel' },
  { value: 'visual_album', label: 'Visual Album' },
  { value: 'web_series', label: 'Web Series' },
  { value: 'other', label: 'Other' },
]

export const PROJECT_STATUSES = [
  { value: 'concept', label: 'Concept' },
  { value: 'development', label: 'In Development' },
  { value: 'production', label: 'Production' },
  { value: 'post', label: 'Post-Production' },
  { value: 'complete', label: 'Complete' },
]
