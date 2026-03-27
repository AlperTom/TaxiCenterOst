# 🔧 Setup-Fehler beheben

## Problem
```
ERROR: 42P01: relation "tenants" does not exist
```

Die Tabelle existiert noch nicht, weil die Migrationen nicht ausgeführt wurden.

## Lösung

### Option 1: Neue kombinierte SQL-Datei (EMPFOHLEN)

Führe im Supabase SQL Editor aus:

**Datei:** `scripts/setup-database-complete.sql`

Diese Datei enthält:
1. ✅ Schema (alle Tabellen)
2. ✅ Funktionen
3. ✅ Initiale Daten

Schritte:
1. Öffne: https://vvwtkkatgegcezfubhxx.supabase.co/project/sql
2. Klicke "New query"
3. Kopiere den Inhalt von `scripts/setup-database-complete.sql`
4. Führe aus (Run)

### Option 2: Manuelle Reihenfolge

Falls du die einzelnen Dateien verwenden willst, muss die Reihenfolge stimmen:

**Schritt 1:** `src/supabase/migrations/001_initial_schema.sql`
→ Erstellt alle Tabellen

**Schritt 2:** `src/supabase/migrations/002_functions.sql`
→ Erstellt Funktionen

**Schritt 3:** `scripts/setup-database.sql`
→ Fügt Beispiel-Daten ein

## Überprüfung

Nach erfolgreichem Setup sollten diese Tabellen existieren:

```sql
-- Teste mit:
SELECT * FROM tenants;
SELECT * FROM drivers;
SELECT * FROM bookings LIMIT 1;
```

## Nächste Schritte

1. SQL ausführen ⬅️ **DU BIST HIER**
2. Edge Function deployen: `supabase functions deploy telegram-bot`
3. Telegram Webhook setzen
4. Gruppen-ID in DB speichern

---

**Hinweis:** Die Datei `setup-database-complete.sql` ist neu erstellt und enthält alles in einer Datei - keine Reihenfolge-Probleme mehr!
