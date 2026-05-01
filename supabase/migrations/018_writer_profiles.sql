-- Writer profiles v0.3 — public profile page at /w/{handle}.
-- Anuj 2026-04-29.

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists imdb_url text;

create unique index if not exists profiles_handle_unique
  on public.profiles(lower(handle))
  where handle is not null;

-- Backfill handle for existing users from full_name.
do $$
declare
  rec record;
  base_slug text;
  candidate text;
  n int;
begin
  for rec in select id, full_name, email from public.profiles where handle is null
  loop
    base_slug := lower(regexp_replace(coalesce(rec.full_name, split_part(rec.email,'@',1)), '[^a-z0-9]+', '-', 'gi'));
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' or base_slug is null then base_slug := 'writer'; end if;
    if length(base_slug) > 32 then base_slug := substring(base_slug from 1 for 32); end if;
    candidate := base_slug;
    n := 1;
    while exists (select 1 from public.profiles where lower(handle) = lower(candidate)) loop
      n := n + 1;
      candidate := base_slug || '-' || n;
    end loop;
    update public.profiles set handle = candidate where id = rec.id;
  end loop;
end $$;

drop policy if exists "anyone can read public profile fields" on public.profiles;
create policy "anyone can read public profile fields"
  on public.profiles for select
  using (true);

insert into storage.buckets (id, name, public) values ('avatars','avatars',true) on conflict (id) do nothing;

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update their own avatar" on storage.objects;
create policy "users update their own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete their own avatar" on storage.objects;
create policy "users delete their own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
