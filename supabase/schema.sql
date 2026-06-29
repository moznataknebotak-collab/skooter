create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ─── Users ────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null default 'mechanic' check (role in ('admin', 'dispatcher', 'mechanic')),
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'mechanic')
  )
  on conflict (id) do update
    set name = excluded.name, role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Jobs ─────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
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

-- ─── Stock ────────────────────────────────────────────────────────────────────
create table if not exists public.stock_items (
  id serial primary key,
  mechanic_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  qty integer not null default 0,
  min_qty integer not null default 1,
  multi boolean not null default false,
  created_at timestamptz default now()
);

-- ─── Job parts ────────────────────────────────────────────────────────────────
create table if not exists public.job_parts (
  id serial primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  stock_item_id integer references public.stock_items(id),
  qty integer not null default 1
);

-- ─── Chat ─────────────────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id serial primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  from_role text not null,
  text text not null,
  created_at timestamptz default now()
);

-- ─── Shopping lists ───────────────────────────────────────────────────────────
create table if not exists public.shopping_lists (
  id serial primary key,
  mechanic_id uuid references public.users(id) on delete cascade not null,
  items jsonb not null default '[]'::jsonb,
  sent_at timestamptz default now(),
  resolved boolean default false
);

-- ─── RPC: deduct stock ────────────────────────────────────────────────────────
create or replace function public.deduct_stock(
  p_mechanic_id uuid, p_item_id integer, p_qty integer
) returns void language plpgsql security definer as $$
begin
  update public.stock_items
  set qty = greatest(0, qty - p_qty)
  where id = p_item_id and mechanic_id = p_mechanic_id;
end;
$$;

-- ─── RPC: admin změna hesla ───────────────────────────────────────────────────
create or replace function public.admin_set_user_password(
  p_user_id uuid, p_password text
) returns void language plpgsql security definer as $$
declare v_role text;
begin
  select role into v_role from public.users where id = auth.uid();
  if v_role != 'admin' then
    raise exception 'Forbidden';
  end if;
  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf'))
  where id = p_user_id;
end;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.jobs enable row level security;
alter table public.stock_items enable row level security;
alter table public.job_parts enable row level security;
alter table public.chat_messages enable row level security;
alter table public.shopping_lists enable row level security;

-- Smaž staré politiky
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public'
    and tablename in ('users','jobs','stock_items','job_parts','chat_messages','shopping_lists')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- USERS
create policy "users_select" on public.users for select using (auth.uid() is not null);
create policy "users_insert" on public.users for insert with check (
  auth.uid() = id or
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "users_update" on public.users for update using (
  auth.uid() = id or
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "users_delete" on public.users for delete using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- JOBS
create policy "jobs_select" on public.jobs for select using (
  mechanic_id = auth.uid() or
  exists (select 1 from public.users where id = auth.uid() and role in ('dispatcher','admin'))
);
create policy "jobs_insert" on public.jobs for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role in ('dispatcher','admin'))
);
create policy "jobs_update" on public.jobs for update using (
  mechanic_id = auth.uid() or
  exists (select 1 from public.users where id = auth.uid() and role in ('dispatcher','admin'))
);
create policy "jobs_delete" on public.jobs for delete using (
  exists (select 1 from public.users where id = auth.uid() and role in ('dispatcher','admin'))
);

-- STOCK
create policy "stock_select" on public.stock_items for select using (
  mechanic_id = auth.uid() or
  exists (select 1 from public.users where id = auth.uid() and role in ('dispatcher','admin'))
);
create policy "stock_all" on public.stock_items for all using (
  mechanic_id = auth.uid() or
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- JOB PARTS
create policy "job_parts_select" on public.job_parts for select using (auth.uid() is not null);
create policy "job_parts_insert" on public.job_parts for insert with check (auth.uid() is not null);

-- CHAT
create policy "chat_select" on public.chat_messages for select using (auth.uid() is not null);
create policy "chat_insert" on public.chat_messages for insert with check (auth.uid() is not null);

-- SHOPPING
create policy "shopping_select" on public.shopping_lists for select using (
  mechanic_id = auth.uid() or
  exists (select 1 from public.users where id = auth.uid() and role in ('dispatcher','admin'))
);
create policy "shopping_insert" on public.shopping_lists for insert with check (mechanic_id = auth.uid());
create policy "shopping_update" on public.shopping_lists for update using (
  exists (select 1 from public.users where id = auth.uid() and role in ('dispatcher','admin'))
);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'stock_items'
  ) then
    alter publication supabase_realtime add table public.stock_items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'shopping_lists'
  ) then
    alter publication supabase_realtime add table public.shopping_lists;
  end if;
end $$;