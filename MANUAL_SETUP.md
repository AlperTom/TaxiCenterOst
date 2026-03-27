# Manuelles Setup - Taxi Center Ostbahnhof

Da die automatische Ausführung in dieser Umgebung nicht möglich ist, hier die Schritte die du lokal ausführen musst:

## Voraussetzungen

1. **Node.js** installiert (https://nodejs.org)
2. **Supabase CLI** installiert:
   ```bash
   npm install -g supabase
   ```

## Schritt-für-Schritt Setup

### 1. Terminal öffnen

Navigiere zum Projektordner:
```bash
cd "C:\Users\Alper\OneDrive\Tombulca\2026\TaxiCenterOst"
```

### 2. Supabase Login

```bash
supabase login
```

Das öffnet einen Browser für die Anmeldung.

### 3. Projekt verknüpfen

```bash
supabase link --project-ref vvwtkkatgegcezfubhxx
```

### 4. Secrets setzen (Telegram Bot Token)

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM"
```

### 5. Datenbank migrieren

```bash
supabase db push
```

Falls das fehlschlägt, führe die SQL-Dateien manuell im Supabase Dashboard aus:
- https://vvwtkkatgegcezfubhxx.supabase.co/project/sql
- Inhalt von `src/supabase/migrations/001_initial_schema.sql` kopieren & ausführen
- Inhalt von `src/supabase/migrations/002_functions.sql` kopieren & ausführen

### 6. Initial-Daten einspielen

Im Supabase SQL Editor:
- Inhalt von `scripts/setup-database.sql` kopieren & ausführen

### 7. Edge Function deployen

```bash
supabase functions deploy telegram-bot
```

### 8. Telegram Webhook setzen

**Windows PowerShell:**
```powershell
$TOKEN = "8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM"
$WEBHOOK = "https://vvwtkkatgegcezfubhxx.supabase.co/functions/v1/telegram-bot"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body "{`"url`":`"$WEBHOOK`",`"max_connections`":40,`"allowed_updates`":[`"callback_query`",`"message`"]}"
```

**Oder cURL:**
```bash
curl -X POST "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://vvwtkkatgegcezfubhxx.supabase.co/functions/v1/telegram-bot","max_connections":40}'
```

### 9. Webhook testen

```bash
curl https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/getWebhookInfo
```

## Telegram Einrichtung

### Gruppe erstellen:
1. In Telegram neue Gruppe erstellen
2. Bot hinzufügen: @taxi_center_ost_bot
3. Bot als **Admin** ernennen
4. Gruppen-ID ermitteln:
   ```bash
   curl https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/getUpdates
   ```

### Gruppen-ID speichern:
Im Supabase SQL Editor:
```sql
UPDATE tenants 
SET telegram_group_id = -1001234567890  -- Deine Gruppen-ID hier
WHERE slug = 'ostbahnhof';
```

## Frontend starten

```bash
npm install
npm run dev
```

Admin Dashboard: http://localhost:5173/admin

## Alternative: Alles auf einmal

Führe nach der Supabase CLI Installation einfach aus:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts/supabase-full-setup.ps1
```

Das macht alle Schritte automatisch!

---

**Hilfe:** Siehe `SETUP_VVWTKKATGEGCEZFUBHXX.md` für detaillierte Informationen.
