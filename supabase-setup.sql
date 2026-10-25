-- JO16-3 gedeelde appstatus (bewust ZONDER login)
-- LET OP: iedereen met publieke API-toegang kan deze gegevens lezen/wijzigen.
create table if not exists public.jo163_app_state (
  id integer primary key check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.jo163_app_state enable row level security;
grant select, insert, update on public.jo163_app_state to anon;
drop policy if exists "jo163_public_read" on public.jo163_app_state;
drop policy if exists "jo163_public_insert" on public.jo163_app_state;
drop policy if exists "jo163_public_update" on public.jo163_app_state;
create policy "jo163_public_read" on public.jo163_app_state for select to anon using (true);
create policy "jo163_public_insert" on public.jo163_app_state for insert to anon with check (id = 1);
create policy "jo163_public_update" on public.jo163_app_state for update to anon using (id = 1) with check (id = 1);
insert into public.jo163_app_state(id,data) values (1,'{}'::jsonb) on conflict (id) do nothing;
