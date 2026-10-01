-- Tablas auxiliares para la primera iteracion de jornadas y disponibilidad.
-- Ejecuta esto en Supabase SQL Editor.

create table if not exists rounds (
  id bigint generated always as identity primary key,
  season_id bigint not null references seasons(id) on delete cascade,
  number int not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('draft', 'open', 'generated', 'closed')),
  created_at timestamptz not null default now(),
  unique (season_id, number)
);

create table if not exists player_availability (
  id bigint generated always as identity primary key,
  round_id bigint not null references rounds(id) on delete cascade,
  player_id bigint not null references players(id) on delete cascade,
  weekdays text[] not null,
  updated_at timestamptz not null default now(),
  unique (round_id, player_id)
);

create index if not exists idx_player_availability_round on player_availability(round_id);
create index if not exists idx_player_availability_player on player_availability(player_id);

alter table rounds enable row level security;
alter table player_availability enable row level security;

-- Lectura opcional desde frontend con anon/authenticated.
-- Si toda lectura la haces por backend con service role, puedes omitir estas policies.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rounds'
      and policyname = 'public_read_rounds'
  ) then
    create policy "public_read_rounds"
      on rounds for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_availability'
      and policyname = 'public_read_player_availability'
  ) then
    create policy "public_read_player_availability"
      on player_availability for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

-- No crear policies de escritura para anon/authenticated en este escenario sin login.
