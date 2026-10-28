/** Paste this into Supabase's SQL Editor once. It creates the private table your data is saved in. */
export const SETUP_SQL = `create table if not exists public.app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  device text
);

alter table public.app_data enable row level security;

drop policy if exists "own row select" on public.app_data;
drop policy if exists "own row insert" on public.app_data;
drop policy if exists "own row update" on public.app_data;

create policy "own row select" on public.app_data
  for select using (auth.uid() = user_id);
create policy "own row insert" on public.app_data
  for insert with check (auth.uid() = user_id);
create policy "own row update" on public.app_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);`;
