-- GEM Studio Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (Creator profiles)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text not null,
  avatar_url text,
  statement text, -- creator manifesto/statement
  bio text,
  skills text[] default '{}', -- e.g. {'writing', 'directing', 'sound-design'}
  genres text[] default '{}', -- e.g. {'horror', 'sci-fi', 'drama'}
  influences text[] default '{}', -- e.g. {'Nolan', 'Villeneuve', 'A24'}
  website text,
  location text,
  accomplishments text, -- free-form accomplishments/credits
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Anyone can view profiles
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

-- Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Users can insert their own profile
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- ============================================
-- PROJECTS
-- ============================================
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  medium text, -- 'feature_film', 'short_film', 'series', 'social_channel', 'visual_album', etc.
  genre text[] default '{}',
  status text default 'concept', -- 'concept', 'development', 'production', 'post', 'complete'
  funding_needed text, -- free-form funding description
  materials_urls text[] default '{}', -- links to scripts, mood boards, etc.
  cover_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Projects are viewable by everyone" on public.projects
  for select using (true);

create policy "Users can create own projects" on public.projects
  for insert with check (auth.uid() = creator_id);

create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = creator_id);

create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = creator_id);

-- ============================================
-- COLLABORATION ROLES (slots on a project)
-- ============================================
create table public.collaboration_roles (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null, -- e.g. 'Sound Designer', 'Composer', 'Concept Artist'
  description text,
  skills_needed text[] default '{}',
  filled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.collaboration_roles enable row level security;

create policy "Roles are viewable by everyone" on public.collaboration_roles
  for select using (true);

create policy "Project owners can manage roles" on public.collaboration_roles
  for all using (
    auth.uid() in (select creator_id from public.projects where id = project_id)
  );

-- ============================================
-- COLLABORATION INVITES
-- ============================================
create table public.invites (
  id uuid default uuid_generate_v4() primary key,
  from_id uuid references public.profiles(id) on delete cascade not null,
  to_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  role_id uuid references public.collaboration_roles(id) on delete cascade,
  message text,
  status text default 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz default now()
);

alter table public.invites enable row level security;

create policy "Users can view their invites" on public.invites
  for select using (auth.uid() = from_id or auth.uid() = to_id);

create policy "Users can send invites" on public.invites
  for insert with check (auth.uid() = from_id);

create policy "Recipients can update invites" on public.invites
  for update using (auth.uid() = to_id);

-- ============================================
-- MESSAGES (DMs)
-- ============================================
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now()
);

create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "Users can view their conversations" on public.conversations
  for select using (
    id in (select conversation_id from public.conversation_participants where user_id = auth.uid())
  );

create policy "Users can create conversations" on public.conversations
  for insert with check (true);

create policy "Users can view their participations" on public.conversation_participants
  for select using (user_id = auth.uid() or conversation_id in (
    select conversation_id from public.conversation_participants where user_id = auth.uid()
  ));

create policy "Users can add participants" on public.conversation_participants
  for insert with check (true);

create policy "Users can view messages in their conversations" on public.messages
  for select using (
    conversation_id in (select conversation_id from public.conversation_participants where user_id = auth.uid())
  );

create policy "Users can send messages in their conversations" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    conversation_id in (select conversation_id from public.conversation_participants where user_id = auth.uid())
  );

-- ============================================
-- ACTIVITY FEED VIEW (materialized for performance)
-- ============================================
create or replace view public.activity_feed as
  select
    'new_project' as type,
    p.id as item_id,
    p.title as title,
    p.description as description,
    p.creator_id as actor_id,
    pr.full_name as actor_name,
    pr.avatar_url as actor_avatar,
    p.created_at as created_at
  from public.projects p
  join public.profiles pr on p.creator_id = pr.id
  union all
  select
    'new_creator' as type,
    pr.id as item_id,
    pr.full_name as title,
    pr.statement as description,
    pr.id as actor_id,
    pr.full_name as actor_name,
    pr.avatar_url as actor_avatar,
    pr.created_at as created_at
  from public.profiles pr
  order by created_at desc;

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- FUNCTION: Find matching creators for a project's open roles
-- ============================================
create or replace function public.get_recommended_collaborators(for_user_id uuid)
returns table (
  project_id uuid,
  project_title text,
  role_id uuid,
  role_title text,
  creator_id uuid,
  creator_name text,
  creator_avatar text,
  match_reason text
) as $$
begin
  return query
  select
    cr.project_id,
    p.title as project_title,
    cr.id as role_id,
    cr.title as role_title,
    p.creator_id,
    pr.full_name as creator_name,
    pr.avatar_url as creator_avatar,
    'Your skills match this role' as match_reason
  from public.collaboration_roles cr
  join public.projects p on cr.project_id = p.id
  join public.profiles pr on p.creator_id = pr.id
  join public.profiles me on me.id = for_user_id
  where cr.filled_by is null
    and p.creator_id != for_user_id
    and (cr.skills_needed && me.skills or p.genre && me.genres)
  order by p.created_at desc
  limit 20;
end;
$$ language plpgsql security definer;
