# SkootrServis

Interní webová aplikace pro správu servisních zakázek elektrických skútrů.

## Technologie

- **React** — frontend
- **Supabase** — databáze, autentizace, realtime, storage
- **Vercel** — hosting

---

## Postup zprovoznění

### 1. Supabase

1. Vytvoř účet na [supabase.com](https://supabase.com) a klikni **New project**
2. V **SQL Editor** zkopíruj a spusť celý obsah souboru `supabase/schema.sql`
3. V **Settings → API** zkopíruj:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **anon public** key → `REACT_APP_SUPABASE_ANON_KEY`

#### Přidat uživatele (mechanika / dispečera)

V Supabase jdi do **Authentication → Users → Invite user**.

Po vytvoření uživatele mu nastav roli v tabulce `users`:

```sql
update public.users set name = 'Pavel Novák', role = 'mechanic' where id = 'UUID_UZIVATELE';
```

Role jsou: `mechanic` nebo `dispatcher`.

#### Nastavit sklad mechanikovi

V SQL Editoru spusť (nahraď UUID):

```sql
insert into public.stock_items (mechanic_id, name, qty, min_qty, multi) values
  ('MECHANIC_UUID', 'Brzdová destička přední', 4, 2, false),
  ('MECHANIC_UUID', 'Šroubky M4', 50, 10, true);
  -- atd.
```

---

### 2. GitHub

```bash
git init
git add .
git commit -m "init: SkootrServis"
# Vytvoř repozitář na github.com, pak:
git remote add origin https://github.com/TVOJE_JMENO/skootr-servis.git
git push -u origin main
```

---

### 3. Vercel

1. Jdi na [vercel.com](https://vercel.com) → **New Project** → Import z GitHubu
2. Vyber repozitář `skootr-servis`
3. Přidej **Environment Variables**:

| Proměnná | Hodnota |
|---|---|
| `REACT_APP_SUPABASE_URL` | https://xxx.supabase.co |
| `REACT_APP_SUPABASE_ANON_KEY` | tvůj anon key |

4. Klikni **Deploy**

Aplikace poběží na `https://skootr-servis.vercel.app` — tuto URL dáš mechanikům a dispečerům do telefonu (přidat na plochu jako PWA).

Každý `git push` do `main` větve = automatický deploy.

---

### 4. Lokální vývoj

```bash
# Zkopíruj env soubor
cp .env.example .env
# Vlož své Supabase klíče do .env

npm install
npm start
```

---

## Struktura projektu

```
src/
  App.js                  # Root, auth routing
  supabase.js             # Supabase klient
  hooks/
    useAuth.js            # Přihlášení, profil
    useJobs.js            # Zakázky + realtime
    useStock.js           # Sklad mechanika
    useChat.js            # Chat uvnitř zakázky (realtime)
    useShoppingList.js    # Nákupní seznam
    useMechanics.js       # Seznam mechaniků
  components/
    Login.js              # Přihlašovací obrazovka
    Dispatcher.js         # Pohled dispečera
    Mechanic.js           # Pohled mechanika
    JobSheet.js           # Detail zakázky (sdílený modal)
    PartsPicker.js        # Výběr dílů se zaškrtáváním
    ShoppingListSheet.js  # Nákupní seznam
    NewJobSheet.js        # Formulář nové zakázky
    ui.js                 # Sdílené tokeny, komponenty
supabase/
  schema.sql              # Kompletní SQL schéma
  functions/
    send-notification/    # Edge function pro push notifikace
```

---

## Sazebník (automatický výpočet)

| Položka | Cena |
|---|---|
| Výjezd | 40 € |
| Každý km | 1,20 € |
| Hodina práce | 40 € |
