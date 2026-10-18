-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen.
create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "eigenen Stand lesen" on public.progress
  for select using (auth.uid() = user_id);
create policy "eigenen Stand anlegen" on public.progress
  for insert with check (auth.uid() = user_id);
create policy "eigenen Stand ändern" on public.progress
  for update using (auth.uid() = user_id);
