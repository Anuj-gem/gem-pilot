-- contact_messages: inbound messages from viewers to writers via the
-- "Contact Writer" button on the report page. Email delivery is deferred —
-- rows are stored here now and surfaced to the writer in-app; outbound email
-- will be wired when we revamp all transactional emails.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.script_evaluations(id) on delete cascade,
  submission_id uuid not null references public.script_submissions(id) on delete cascade,
  -- writer_id denormalized for fast "my inbox" queries
  writer_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_name text,
  message text not null check (char_length(message) between 10 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_writer_id_created_at_idx
  on public.contact_messages (writer_id, created_at desc);
create index if not exists contact_messages_evaluation_id_idx
  on public.contact_messages (evaluation_id);

alter table public.contact_messages enable row level security;

-- Writers can read their own inbox
create policy "writers read own messages"
  on public.contact_messages for select
  using (auth.uid() = writer_id);

-- Senders can read their own sent messages
create policy "senders read own sent"
  on public.contact_messages for select
  using (auth.uid() = sender_id);

-- Inserts happen via a service-role API route (validates subscription gating),
-- so we deliberately don't add a user-facing insert policy here.
