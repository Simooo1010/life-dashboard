-- ==============================================================================
-- Life Dashboard - Supabase Cache Setup
-- Esegui questo script nel SQL Editor del tuo progetto Supabase.
-- Può essere rieseguito in sicurezza su un progetto esistente: crea solo ciò
-- che manca (es. la tabella sync_log aggiunta dopo il primo setup).
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

drop policy if exists "Allow anon access for life dashboard" on life_dashboard_syntheses;
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

drop policy if exists "Allow anon access for knowledge content cache" on knowledge_content_cache;
create policy "Allow anon access for knowledge content cache"
  on knowledge_content_cache for all using (true) with check (true);
drop policy if exists "Allow anon access for second brain runs" on second_brain_runs;
create policy "Allow anon access for second brain runs"
  on second_brain_runs for all using (true) with check (true);
drop policy if exists "Allow anon access for second brain history" on second_brain_history;
create policy "Allow anon access for second brain history"
  on second_brain_history for all using (true) with check (true);

-- ==============================================================================
-- Sync log: history of every automatic (cache-triggered) and manual sync run
-- ==============================================================================
create table if not exists sync_log (
  id bigint generated always as identity primary key,
  source text not null,
  trigger text not null,
  status text not null,
  started_at timestamp with time zone not null,
  finished_at timestamp with time zone not null,
  duration_ms integer not null,
  detail text,
  error_message text
);

create index if not exists sync_log_started_at_idx on sync_log (started_at desc);

alter table sync_log enable row level security;

drop policy if exists "Allow anon access for sync log" on sync_log;
create policy "Allow anon access for sync log"
  on sync_log for all using (true) with check (true);
