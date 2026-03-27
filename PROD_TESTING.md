# 🚀 Produktions-Test Guide

## Pre-Flight Checkliste

```bash
# 1. Umgebungsvariablen prüfen
cat .env.local
# VITE_SUPABASE_URL=https://vvwtkkatgegcezfubhxx.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_secret_...

# 2. Build testen
npm run build

# 3. Lint check
npm run lint

# 4. TypeScript check
npx tsc --noEmit
```

---

## ✅ Test-Szenarien

### 1. Landing Page (Kunden-Ansicht)

| Test | Schritte | Erwartet | ✅ |
|------|----------|----------|---|
| Homepage laden | `npm run dev` → http://localhost:5173 | Header, Hero, Services sichtbar | ⬜ |
| Mobile Responsive | Chrome DevTools → iPhone SE | Layout passt sich an | ⬜ |
| Buchungsformular | "Jetzt buchen" klicken | Formular öffnet sich | ⬜ |
| Preisberechnung | Adresse eingeben | Preis wird berechnet | ⬜ |

### 2. Admin Dashboard

| Test | Schritte | Erwartet | ✅ |
|------|----------|----------|---|
| Dashboard laden | http://localhost:5173/admin | Statistiken sichtbar | ⬜ |
| Buchungsliste | Tab "Buchungen" | Liste lädt, Filter funktionieren | ⬜ |
| Rechnungsanfragen | Tab "Rechnungsanfragen" | Nur Rechnungs-Buchungen | ⬜ |
| Fahrer-Gebühren | Tab "Fahrer & Gebühren" | Schulden werden angezeigt | ⬜ |

### 3. Datenbank-Tests (Supabase)

```sql
-- Test 1: Tenant existiert
SELECT * FROM tenants WHERE slug = 'ostbahnhof';
-- → 1 Row

-- Test 2: Fahrer vorhanden
SELECT * FROM drivers WHERE is_active = true;
-- → 3 Rows (Klaus, Maria, Hans)

-- Test 3: Preisberechnung
SELECT * FROM calculate_munich_price(25, 2, false);
-- → base_fare: 5.90, distance_fare: 67.50, total: 73.40

-- Test 4: Festpreis-Route
SELECT * FROM calculate_munich_price(40, 1, false, 48.14, 11.56, 48.35, 11.79);
-- → fixed_price: 106.00 (Hbf-Flughafen)
```

### 4. Telegram-Integration

```bash
# Test 1: Webhook-Status
curl https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/getWebhookInfo

# Erwartet:
# {"ok":true,"result":{"url":"https://vvwtkkatgegcezfubhxx.supabase.co/functions/v1/telegram-bot",...}}
```

**Manueller Test:**
1. Buchung erstellen (Admin Dashboard oder SQL)
2. Auf "An Telegram senden" klicken
3. In Telegram-Gruppe prüfen:
   - [ ] Anonyme Nachricht erscheint
   - [ ] "ANNEHMEN" Button sichtbar
   - [ ] Keine Kundendaten in Gruppe!

4. Als Fahrer "ANNEHMEN" klicken:
   - [ ] Nachricht wird aktualisiert ("Vergeben an...")
   - [ ] Private Nachricht mit Kundendaten
   - [ ] 5% Gebühr in DB eingetragen

### 5. Edge Function Test

```bash
# Test via curl
curl -X POST https://vvwtkkatgegcezfubhxx.supabase.co/functions/v1/telegram-bot \
  -H "Content-Type: application/json" \
  -d '{"update_id":1,"callback_query":{"id":"test","from":{"id":123},"data":"claim:test-uuid"}}'

# Erwartet: {"ok":true} oder Fehler mit validem JSON
```

---

## 🔴 Kritische Tests (Müssen bestehen)

### Security-Tests

| Test | Methode | Erwartet |
|------|---------|----------|
| Kein Service-Key im Client | `grep -r "SERVICE_ROLE" src/` | Keine Treffer außer in `.env.example` |
| RLS aktiv | Supabase Dashboard → Table → RLS | Policies sichtbar |
| API-Layer genutzt | `grep -r "supabase.from" src/pages/` | Keine direkten Calls (nur über `api.`) |

### Datenschutz-Tests

| Test | Schritt | Erwartet |
|------|---------|----------|
| Kundendaten nicht in Gruppe | Telegram-Gruppe checken | Nur ID, Zeit, Stadtteil, Preis |
| Private Daten nur nach Claim | Private Nachricht checken | Name, Telefon, Adresse sichtbar |
| Audit-Log | `SELECT * FROM audit_logs` | Alle Änderungen protokolliert |

---

## 📊 Performance-Tests

```bash
# Lighthouse Test (Chrome DevTools)
# Erwartete Werte:
# - Performance: > 80
# - Accessibility: > 90
# - Best Practices: > 90
# - SEO: > 90
```

### API-Response-Zeiten

| Endpunkt | Max. Zeit | Test |
|----------|-----------|------|
| Buchungen laden | < 500ms | Network Tab |
| Preisberechnung | < 100ms | Console timing |
| Telegram Webhook | < 2000ms | Edge Function Logs |

---

## 🐛 Fehlerbehebung

### Problem: "Failed to fetch"
```bash
# Lösung: CORS checken
supabase functions serve telegram-bot --debug
```

### Problem: Telegram Webhook nicht erreichbar
```bash
# Webhook neu setzen
curl -X POST "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/setWebhook" \
  -d "url=https://vvwtkkatgegcezfubhxx.supabase.co/functions/v1/telegram-bot"
```

### Problem: Buchung nicht in Telegram
```sql
-- Prüfen:
SELECT telegram_group_id FROM tenants WHERE slug = 'ostbahnhof';
-- Muss eine Zahl mit -100... sein

-- Fix:
UPDATE tenants SET telegram_group_id = -100XXXXXXXXXX WHERE slug = 'ostbahnhof';
```

---

## 📝 Test-Dokumentation

### Erfolgreicher Test-Lauf

```
Datum: ___________
Tester: __________

[ ] Landing Page OK
[ ] Admin Dashboard OK
[ ] DB-Abfragen OK
[ ] Telegram Webhook OK
[ ] Anonyme Nachricht OK
[ ] Claim funktioniert OK
[ ] Private Nachricht OK
[ ] 5% Gebühr berechnet OK
[ ] Mobile Responsive OK
[ ] Security-Checks OK

Signatur: ___________
```

---

## 🚨 Go-Live Checkliste

- [ ] Alle Tests bestanden
- [ ] Umgebungsvariablen in Production gesetzt
- [ ] Telegram Bot in Produktions-Gruppe
- [ ] Fahrer registriert mit Telegram-IDs
- [ ] Domain/SSL eingerichtet (falls extern gehostet)
- [ ] Backup-Strategie dokumentiert
- [ ] Rollback-Plan bereit

**Go-Live genehmigt von:** ___________

**Datum Go-Live:** ___________
