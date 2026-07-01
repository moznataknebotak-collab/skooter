# SkootrServis v3

Interní webová aplikace pro správu servisních zakázek elektrických skútrů.

## Co je nového ve v3

- **GPS sledování kilometrů** — automatický výpočet ujeté vzdálenosti při navigaci k zákazníkovi
- **Fotky do Supabase Storage** — skutečné nahrávání fotek před/po, ne jen mock
- **Skutečné PDF reporty** — generování kompletního reportu s fotkami, podpisem a vyúčtováním
- **Offline podpora** — Service Worker + lokální fronta akcí, synchronizace po obnovení připojení
- **Stavy zakázky** — Čeká → Na cestě → U zákazníka → Probíhá → Dokončeno (automaticky podle GPS/akcí)
- **Filtrování a vyhledávání** — dispečer filtruje podle mechanika, stavu, hledá podle jména
- **Dashboard** — měsíční výnosy, graf zakázek za 7 dní, výkon jednotlivých mechaniků
- **Push notifikace v prohlížeči** — Web Notifications API, funguje i se zavřenou záložkou
- **Autocomplete zákazníků** — při zadávání zakázky se našeptávají dřívější zákazníci
- **Tmavý režim** — přepínač 🌙/☀️ v hlavičce
- **Interní poznámky** — pole "složitost opravy" viditelné jen pro tým
- **Export do CSV** — dispečer stáhne přehled zakázek pro účetnictví
- **Časové okno zakázky** — dispečer nastaví kdy má mechanik dorazit

---

## Krok za krokem — co musíš udělat

### 1. Supabase — spusť SQL migraci

Pokud už máš databázi z předchozí verze, **nemusíš nic mazat**. Stačí spustit jeden nový soubor.

V Supabase **SQL Editor** spusť celý obsah `supabase/migration_v3.sql`.

Tento soubor:
- přidá nové sloupce do `jobs` (time_window, complexity, signature_data)
- rozšíří povolené stavy zakázky o "on_the_way" a "at_customer"
- vytvoří Storage bucket `job-photos` pro fotky a nastaví mu práva

*(Pokud zakládáš databázi úplně od začátku, spusť nejdřív `supabase/schema.sql` a pak `supabase/migration_v3.sql`.)*

### 2. Supabase — over Storage bucket

Jdi do **Storage** v levém menu a zkontroluj že vidíš bucket `job-photos` označený jako Public. Pokud migrace neproběhla, vytvoř ho ručně: New bucket → název `job-photos` → zaškrtni Public.

### 3. GitHub — nahraď soubory

Zkopíruj **celý obsah složky `src/` a `public/`** z tohoto ZIPu do svého projektu (přepiš všechno). Nové soubory které přibyly:

```
src/hooks/useGPS.js
src/hooks/useStorage.js
src/hooks/usePDF.js
src/hooks/usePushNotifications.js
src/hooks/useCustomers.js
src/hooks/useExportCSV.js
src/hooks/useOfflineQueue.js
src/components/Dashboard.js
src/components/ThemeToggle.js
src/components/OfflineIndicator.js
public/sw.js
public/manifest.json
```

Pak v terminálu:

```bash
git add .
git commit -m "v3: GPS, fotky, PDF, offline, dashboard, dark mode"
git push origin main
```

Vercel nasadí automaticky.

### 4. Otestuj po nasazení

Otevři aplikaci na telefonu (musí být HTTPS — Vercel to má automaticky):

- **GPS** — prohlížeč se zeptá na povolení polohy, klikni Povolit
- **Notifikace** — klikni na zvonek 🔔 v hlavičce a povol notifikace
- **Fotky** — nahrání fotky vyžaduje povolení kamery
- **Offline** — vypni si na chvíli wifi/data, uvidíš žlutý pruh "Offline"

---

## Struktura projektu

```
src/
  App.js                    # Root, ThemeProvider, auth routing
  components/
    Login.js                # Přihlašovací obrazovka
    Dispatcher.js            # Pohled dispečera — filtry, dashboard, CSV
    Mechanic.js               # Pohled mechanika
    Admin.js                  # Správa uživatelů a skladů
    JobSheet.js                # Detail zakázky — GPS, foto, podpis, PDF
    Dashboard.js                # Grafy a statistiky pro dispečera
    PartsPicker.js               # Výběr dílů ze skladu
    ShoppingListSheet.js          # Nákupní seznam
    NewJobSheet.js                 # Formulář nové zakázky + autocomplete
    ThemeToggle.js                  # Přepínač tmavý/světlý režim
    OfflineIndicator.js              # Indikátor offline stavu
    ui.js                             # Design tokeny, sdílené styly
  hooks/
    useAuth.js                # Přihlášení (čte roli z JWT)
    useJobs.js                 # Zakázky + realtime
    useStock.js                 # Sklad mechanika
    useChat.js                   # Chat v zakázce (realtime)
    useShoppingList.js            # Nákupní seznam
    useMechanics.js                # Seznam mechaniků
    useGPS.js                       # GPS sledování kilometrů
    useStorage.js                    # Upload/stažení fotek
    usePDF.js                         # Generování PDF reportu
    usePushNotifications.js            # Web Push notifikace
    useCustomers.js                     # Autocomplete zákazníků
    useExportCSV.js                      # Export zakázek do CSV
    useOfflineQueue.js                    # Offline fronta + sync
supabase/
  schema.sql                  # Základní schéma (spustit jen jednou, na začátku)
  migration_v3.sql             # Migrace pro v3 funkce (spustit po schema.sql)
public/
  sw.js                  # Service Worker — offline cache + push
  manifest.json            # PWA manifest pro instalaci na plochu
```

---

## Sazebník (automatický výpočet)

| Položka | Cena |
|---|---|
| Výjezd | 40 € |
| Každý km (GPS) | 1,20 € |
| Hodina práce | 40 € |

---

## Známá omezení

- **PDF export** používá tiskové okno prohlížeče (window.print) — funguje spolehlivě, ale vzhled se může mírně lišit mezi prohlížeči. Pro pixel-perfect PDF by bylo potřeba knihovnu jako jsPDF.
- **Push notifikace** fungují jen když je prohlížeč/PWA nainstalovaná a uživatel udělil oprávnění. Skutečné posílání notifikací na pozadí (i se zavřenou aplikací) vyžaduje napojení na Web Push server — základ je připravený v `sw.js`, ale notifikace se aktuálně spouští jen lokálně z klienta.
- **Offline fronta** ukládá akce do localStorage prohlížeče. Pokud mechanik vymaže data prohlížeče před synchronizací, neodeslané akce se ztratí.
