-- SkootrServis — kompletní schéma databáze
-- Spusť celý tento soubor v Supabase SQL Editoru

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users (profiles) ─────────────────────────────────────────────────────────
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null check (role in ('admin', 'dispatcher', 'mechanic')),
  created_at timestamptz default now()
);

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), coalesce(new.raw_user_meta_data->>'role', 'mechanic'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Jobs ─────────────────────────────────────────────────────────────────────
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  client text not null,
  address text not null,
  scooter_type text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  mechanic_id uuid references public.users(id),
  repair_notes text,
  labor_hours float default 0,
  km_travel float default 0,
  earnings jsonb default '{"callout":0,"travel":0,"labor":0,"total":0}'::jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ─── Stock items (per mechanic) ────────────────────────────────────────────────
create table public.stock_items (
  id serial primary key,
  mechanic_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  qty integer not null default 0,
  min_qty integer not null default 1,
  multi boolean not null default false,  -- true = can use multiple per job (e.g. screws)
  created_at timestamptz default now()
);

-- ─── Job parts (used parts per job) ───────────────────────────────────────────
create table public.job_parts (
  id serial primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  stock_item_id integer references public.stock_items(id),
  qty integer not null default 1
);

-- ─── Chat messages ─────────────────────────────────────────────────────────────
create table public.chat_messages (
  id serial primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  from_role text not null check (from_role in ('dispatcher', 'mechanic')),
  text text not null,
  created_at timestamptz default now()
);

-- ─── Shopping lists ────────────────────────────────────────────────────────────
create table public.shopping_lists (
  id serial primary key,
  mechanic_id uuid references public.users(id) on delete cascade not null,
  items jsonb not null default '[]'::jsonb,
  sent_at timestamptz default now(),
  resolved boolean default false
);

-- ─── RPC: deduct stock safely ──────────────────────────────────────────────────
create or replace function public.deduct_stock(
  p_mechanic_id uuid,
  p_item_id integer,
  p_qty integer
)
returns void language plpgsql as $$
begin
  update public.stock_items
  set qty = greatest(0, qty - p_qty)
  where id = p_item_id and mechanic_id = p_mechanic_id;
end;
$$;

-- ─── Row Level Security ────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.jobs enable row level security;
alter table public.stock_items enable row level security;
alter table public.job_parts enable row level security;
alter table public.chat_messages enable row level security;
alter table public.shopping_lists enable row level security;

-- Users: can read all, edit only own
create policy "users_read_all" on public.users for select using (true);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- Jobs: dispatchers see all, mechanics see own
create policy "jobs_dispatcher_all" on public.jobs for all
  using ((select role from public.users where id = auth.uid()) = 'dispatcher');
create policy "jobs_mechanic_own" on public.jobs for select
  using (mechanic_id = auth.uid());
create policy "jobs_mechanic_update_own" on public.jobs for update
  using (mechanic_id = auth.uid());

-- Stock: mechanics see/edit own
create policy "stock_mechanic_own" on public.stock_items for all
  using (mechanic_id = auth.uid());
create policy "stock_dispatcher_read" on public.stock_items for select
  using ((select role from public.users where id = auth.uid()) = 'dispatcher');

-- Job parts: readable by both parties
create policy "job_parts_read" on public.job_parts for select using (true);
create policy "job_parts_insert" on public.job_parts for insert
  with check (
    exists (select 1 from public.jobs where id = job_id and mechanic_id = auth.uid())
    or (select role from public.users where id = auth.uid()) = 'dispatcher'
  );

-- Chat: readable/writable by job mechanic and dispatchers
create policy "chat_read" on public.chat_messages for select using (true);
create policy "chat_insert" on public.chat_messages for insert with check (auth.uid() is not null);

-- Shopping lists: mechanic writes, dispatcher reads all
create policy "shopping_mechanic" on public.shopping_lists for all
  using (mechanic_id = auth.uid());
create policy "shopping_dispatcher_read" on public.shopping_lists for select
  using ((select role from public.users where id = auth.uid()) = 'dispatcher');
create policy "shopping_dispatcher_update" on public.shopping_lists for update
  using ((select role from public.users where id = auth.uid()) = 'dispatcher');

-- ─── Enable realtime ───────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.stock_items;
alter publication supabase_realtime add table public.shopping_lists;

-- ─── Ukázkový sklad pro nového mechanika (spusť ručně po vytvoření účtu) ──────
-- Nahraď 'MECHANIC_UUID' skutečným UUID mechanika z tabulky users
/*
insert into public.stock_items (mechanic_id, name, qty, min_qty, multi) values
  ('MECHANIC_UUID', 'Brzdová destička přední', 4, 2, false),
  ('MECHANIC_UUID', 'Brzdová destička zadní', 5, 2, false),
  ('MECHANIC_UUID', 'Pneumatika 8.5"', 2, 1, false),
  ('MECHANIC_UUID', 'Vzduchová komora', 6, 3, false),
  ('MECHANIC_UUID', 'LED pásek přední', 3, 2, false),
  ('MECHANIC_UUID', 'Kabeláž motoru', 3, 1, false),
  ('MECHANIC_UUID', 'Šroubky M4', 50, 10, true),
  ('MECHANIC_UUID', 'Řídítka komplet', 2, 1, false);
*/

-- ─── Admin: přístup ke všemu ───────────────────────────────────────────────────
-- Admin může číst a upravovat vše
create policy "admin_all_users" on public.users for all
  using ((select role from public.users where id = auth.uid()) = 'admin');

create policy "admin_all_jobs" on public.jobs for all
  using ((select role from public.users where id = auth.uid()) = 'admin');

create policy "admin_all_stock" on public.stock_items for all
  using ((select role from public.users where id = auth.uid()) = 'admin');

create policy "admin_all_shopping" on public.shopping_lists for all
  using ((select role from public.users where id = auth.uid()) = 'admin');

-- ─── Jak nastavit první admin účet ────────────────────────────────────────────
-- 1. Vytvoř uživatele normálně v Supabase Authentication → Users → Add user
-- 2. Spusť tento příkaz (nahraď e-mail):
--
--    update public.users
--    set role = 'admin'
--    where id = (select id from auth.users where email = 'tvuj@email.cz');
--
-- Toto provedeš jen jednou pro sebe jako administrátora.
-- Všechny další uživatele pak přidáváš přímo z aplikace (Admin panel).
