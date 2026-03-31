-- ============================================
-- GEM V2 Migration — Creator Network
-- Run this in your Supabase SQL Editor
-- This extends the existing schema (profiles, scripts, etc.)
-- ============================================

-- Enable UUID generation (may already exist)
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. EXTEND PROFILES TABLE
-- Existing columns: id, email, name, subscription_status, stripe_customer_id, trial_ends_at, created_at
-- We add creator-network columns alongside them
-- ============================================

-- Rename 'name' to 'full_name' for consistency (or add full_name as alias)
-- Keep 'name' intact to avoid breaking old code, add full_name that mirrors it
alter table public.profiles add column if not exists full_name text;
update public.profiles set full_name = name where full_name is null;

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists statement text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] default '{}';
alter table public.profiles add column if not exists genres text[] default '{}';
alter table public.profiles add column if not exists influences text[] default '{}';
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists accomplishments text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- Add policy for public profile viewing (old schema only allowed own-profile reads)
-- Drop the old restrictive policy first, then add both
do $$
begin
  -- Try to drop old policy; ignore if it doesn't exist
  begin
    drop policy "Users can read own profile" on public.profiles;
  exception when undefined_object then null;
  end;
end $$;

create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

-- Allow users to insert their own profile (for new signups)
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- ============================================
-- 2. PROJECTS TABLE (new)
-- ============================================
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  medium text,
  genre text[] default '{}',
  status text default 'concept',
  funding_needed text,
  materials_urls text[] default '{}',
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
-- 3. COLLABORATION ROLES TABLE (new)
-- ============================================
create table if not exists public.collaboration_roles (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  skills_needed text[] default '{}',
  filled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.collaboration_roles enable row level security;

create policy "Roles are viewable by everyone" on public.collaboration_roles
  for select using (true);

create policy "Project owners can insert roles" on public.collaboration_roles
  for insert with check (
    auth.uid() in (select creator_id from public.projects where id = project_id)
  );

create policy "Project owners can update roles" on public.collaboration_roles
  for update using (
    auth.uid() in (select creator_id from public.projects where id = project_id)
  );

create policy "Project owners can delete roles" on public.collaboration_roles
  for delete using (
    auth.uid() in (select creator_id from public.projects where id = project_id)
  );

-- ============================================
-- 4. INVITES TABLE (new)
-- ============================================
create table if not exists public.invites (
  id uuid default uuid_generate_v4() primary key,
  from_id uuid references public.profiles(id) on delete cascade not null,
  to_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  role_id uuid references public.collaboration_roles(id) on delete cascade,
  message text,
  status text default 'pending',
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
-- 5. CONVERSATIONS & MESSAGES (new)
-- ============================================
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
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
  for select using (
    user_id = auth.uid() or conversation_id in (
      select conversation_id from public.conversation_participants where user_id = auth.uid()
    )
  );

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
-- 6. INDEXES
-- ============================================
create index if not exists idx_projects_creator_id on public.projects(creator_id);
create index if not exists idx_projects_created_at on public.projects(created_at desc);
create index if not exists idx_collab_roles_project_id on public.collaboration_roles(project_id);
create index if not exists idx_invites_to_id on public.invites(to_id);
create index if not exists idx_invites_from_id on public.invites(from_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_conv_participants_user_id on public.conversation_participants(user_id);

-- ============================================
-- 7. UPDATE handle_new_user TRIGGER
-- Now populates full_name for the creator network
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, full_name, subscription_status, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'free',
    null
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate the trigger (drop + create to ensure it's updated)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 8. RECOMMENDED COLLABORATORS FUNCTION
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

-- ============================================
-- 9. ENABLE REALTIME for messages
-- ============================================
alter publication supabase_realtime add table public.messages;
