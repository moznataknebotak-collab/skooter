-- SkootrServis v3 — migrace pro nové funkce
-- Spusť tento soubor PO původním schema.sql v Supabase SQL Editoru

-- ─── Nové sloupce v jobs ────────────────────────────────────────────────────
alter table public.jobs add column if not exists time_window text;
alter table public.jobs add column if not exists complexity text check (complexity in ('easy','medium','hard') or complexity is null);
alter table public.jobs add column if not exists signature_data text;

-- ─── Rozšíření stavů zakázky (on_the_way, at_customer) ─────────────────────
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pending', 'on_the_way', 'at_customer', 'in_progress', 'completed'));

-- ─── Storage bucket pro fotky ───────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

-- Storage policies — kdokoliv přihlášený může nahrávat a číst
drop policy if exists "job_photos_select" on storage.objects;
drop policy if exists "job_photos_insert" on storage.objects;
drop policy if exists "job_photos_update" on storage.objects;
drop policy if exists "job_photos_delete" on storage.objects;

create policy "job_photos_select" on storage.objects
  for select using (bucket_id = 'job-photos');

create policy "job_photos_insert" on storage.objects
  for insert with check (bucket_id = 'job-photos' and auth.uid() is not null);

create policy "job_photos_update" on storage.objects
  for update using (bucket_id = 'job-photos' and auth.uid() is not null);

create policy "job_photos_delete" on storage.objects
  for delete using (bucket_id = 'job-photos' and auth.uid() is not null);

-- ─── Hotovo ───────────────────────────────────────────────────────────────────
-- Po spuštění tohoto souboru jsou podporovány:
--   • GPS kilometry (sloupec km_travel se nyní plní automaticky z aplikace)
--   • Stavy zakázky: pending → on_the_way → at_customer → in_progress → completed
--   • Fotky před/po (Supabase Storage bucket "job-photos")
--   • Podpis zákazníka jako base64 PNG v sloupci signature_data
--   • Poznámka o složitosti opravy (complexity)
--   • Časové okno návštěvy (time_window)

-- ─── Tabulka nastavení sazeb ───────────────────────────────────────────────
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),  -- singleton row
  callout numeric not null default 40,
  km_rate numeric not null default 1.2,
  hourly_rate numeric not null default 40,
  updated_at timestamptz default now()
);

-- Vložit výchozí hodnoty pokud řádek neexistuje
insert into public.settings (id, callout, km_rate, hourly_rate)
values (1, 40, 1.2, 40)
on conflict (id) do nothing;

-- RLS — čtení pro všechny přihlášené, zápis jen pro admina a dispečera
alter table public.settings enable row level security;

drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_update" on public.settings;

create policy "settings_select" on public.settings
  for select using (auth.uid() is not null);

create policy "settings_update" on public.settings
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role in ('admin','dispatcher'))
  );

-- Realtime pro okamžitou aktualizaci sazeb u všech přihlášených
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'settings'
  ) then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;

-- ─── Přihlašování přes username ───────────────────────────────────────────────
alter table public.users add column if not exists username text unique;

-- ─── Sazby per mechanik ───────────────────────────────────────────────────────
alter table public.users add column if not exists rate_callout numeric;
alter table public.users add column if not exists rate_km numeric;
alter table public.users add column if not exists rate_hourly numeric;

-- ─── Nastavení admina — username ──────────────────────────────────────────────
-- Stávající admin účet nemá username, nastav ho ručně:
-- update public.users set username = 'admin' where role = 'admin';
-- A nezapomeň aktualizovat user_metadata v auth:
-- update auth.users set raw_user_meta_data = raw_user_meta_data || '{"username":"admin"}'::jsonb
-- where email like '%@skootr.internal' or email = 'tvuj@email.cz';
