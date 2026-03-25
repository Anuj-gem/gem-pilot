-- Migration: Switch from trial model to free-eval model
-- Run this in the Supabase SQL editor

-- 1. Add evals_used column
alter table public.profiles
  add column if not exists evals_used integer not null default 0;

-- 2. Add 'free' to the subscription_status check constraint
--    (drop old constraint and recreate with 'free' included)
alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
    check (subscription_status in ('free', 'trialing', 'active', 'canceled', 'past_due', 'none'));

-- 3. Backfill existing users: anyone who is 'trialing' or 'none' → 'free'
update public.profiles
set subscription_status = 'free'
where subscription_status in ('trialing', 'none');

-- 4. Replace the handle_new_user trigger to use 'free' instead of 'trialing'
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, subscription_status, evals_used)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', null),
    'free',
    0
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. Create the increment_evals_used RPC function
--    Called server-side after a successful evaluation.
create or replace function public.increment_evals_used(user_id uuid)
returns void as $$
begin
  update public.profiles
  set evals_used = evals_used + 1
  where id = user_id;
end;
$$ language plpgsql security definer;

-- Grant execute to the service role (used by the server-side Supabase client)
grant execute on function public.increment_evals_used(uuid) to service_role;
