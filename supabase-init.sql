-- ==============================================================================
-- Life Dashboard - Supabase Cache Setup
-- Esegui questo script nel SQL Editor del tuo nuovo progetto Supabase
-- ==============================================================================

create table if not exists life_dashboard_syntheses (
  id bigint generated always as identity primary key,
  date text not null unique,
  input_hash text not null,
  synthesis_json text not null,
  generated_at timestamp with time zone default now() not null,
  source text default 'groq' not null
);

-- Abilita Row Level Security e crea una policy di accesso per il client anon
alter table life_dashboard_syntheses enable row level security;

create policy "Allow anon access for life dashboard"
  on life_dashboard_syntheses
  for all
  using (true)
  with check (true);

create table if not exists knowledge_content_cache (
  page_id text primary key,
  revision text not null,
  document_json text not null,
  cached_at timestamp with time zone default now() not null
);

create table if not exists second_brain_runs (
  cache_key text primary key,
  local_date text not null,
  result_json text not null,
  generated_at timestamp with time zone default now() not null
);

create table if not exists second_brain_history (
  id bigint generated always as identity primary key,
  date text not null,
  page_id text not null,
  score integer not null,
  created_at timestamp with time zone default now() not null,
  unique (date, page_id)
);

alter table knowledge_content_cache enable row level security;
alter table second_brain_runs enable row level security;
alter table second_brain_history enable row level security;

create policy "Allow anon access for knowledge content cache"
  on knowledge_content_cache for all using (true) with check (true);
create policy "Allow anon access for second brain runs"
  on second_brain_runs for all using (true) with check (true);
create policy "Allow anon access for second brain history"
  on second_brain_history for all using (true) with check (true);
