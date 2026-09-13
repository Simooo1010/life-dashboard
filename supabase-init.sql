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
