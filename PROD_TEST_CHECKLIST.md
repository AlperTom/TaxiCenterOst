# 🚀 Produktions-Test Checkliste

## Voraussetzungen

- [ ] Node.js installiert (https://nodejs.org)
- [ ] Projektordner geöffnet: `C:\Users\Alper\OneDrive\Tombulca\2026\TaxiCenterOst`

---

## Phase 1: Lokale Entwicklung testen

### Schritt 1: Dependencies installieren
```bash
cd "C:\Users\Alper\OneDrive\Tombulca\2026\TaxiCenterOst"
npm install
```
**Erwartet:** Keine Fehler, `node_modules` Ordner wird erstellt

### Schritt 2: Build testen
```bash
npm run build
```
**Erwartet:**
```
dist/                     <-- Ordner wird erstellt
✓ 30 modules transformed.
✓ built in 4.23s
```

### Schritt 3: Linting testen
```bash
npm run lint
```
**Erwartet:** `No ESLint errors found` oder nur Warnings

### Schritt 4: Dev-Server starten
```bash
npm run dev
```
**Erwartet:**
```
  VITE v5.4.19  ready in 340 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

---

## Phase 2: Frontend-Tests

### Test 2.1: Landing Page
| # | Aktion | Erwartet | ✅ |
|---|--------|----------|---|
| 2.1.1 | Öffne http://localhost:5173/ | Seite lädt, Header sichtbar | ⬜ |
| 2.1.2 | Scrolle nach unten | Hero, Services, BookingSystem sichtbar | ⬜ |
| 2.1.3 | Klicke "Jetzt buchen" | Formular öffnet/scrollt | ⬜ |
| 2.1.4 | Gib Adresse ein | Vorschläge erscheinen | ⬜ |

### Test 2.2: Mobile Responsiveness
| # | Aktion | Erwartet | ✅ |
|---|--------|----------|---|
| 2.2.1 | F12 (DevTools) öffnen | Chrome DevTools öffnet sich | ⬜ |
| 2.2.2 | Toggle Device Toolbar (Ctrl+Shift+M) | Mobile View aktiv | ⬜ |
| 2.2.3 | Wähle "iPhone SE" | Layout passt sich an | ⬜ |
| 2.2.4 | Menü-Button testen | Navigation öffnet sich | ⬜ |

### Test 2.3: Admin Dashboard
| # | Aktion | Erwartet | ✅ |
|---|--------|----------|---|
| 2.3.1 | Öffne http://localhost:5173/admin | Dashboard lädt | ⬜ |
| 2.3.2 | Prüfe Statistiken | 4 Karten mit Zahlen | ⬜ |
| 2.3.3 | Tab "Buchungen" | Liste mit Buchungen | ⬜ |
| 2.3.4 | Tab "Rechnungsanfragen" | Nur Rechnungs-Buchungen | ⬜ |
| 2.3.5 | Tab "Fahrer & Gebühren" | Schulden-Tabelle | ⬜ |

---

## Phase 3: Datenbank-Tests (Supabase)

### Schritt 3.1: SQL Editor öffnen
1. Gehe zu: https://vvwtkkatgegcezfubhxx.supabase.co/project/sql
2. Klicke "New query"

### Test 3.2: Datenbank-Abfragen

```sql
-- Test 3.2.1: Tenant existiert
SELECT id, name, slug FROM tenants WHERE slug = 'ostbahnhof';
```
**Erwartet:** 1 Zeile mit "Taxi Center Ostbahnhof"

```sql
-- Test 3.2.2: Fahrer vorhanden
SELECT first_name, last_name, vehicle_type FROM drivers WHERE is_active = true;
```
**Erwartet:** 3 Zeilen (Klaus, Maria, Hans)

```sql
-- Test 3.2.3: Preisberechnung funktioniert
SELECT * FROM calculate_munich_price(25, 2, false);
```
**Erwartet:** base_fare=5.90, distance_fare=67.50, total=73.40

```sql
-- Test 3.2.4: Festpreis Hbf-Flughafen
SELECT * FROM calculate_munich_price(40, 1, false, 48.14, 11.56, 48.35, 11.79);
```
**Erwartet:** fixed_price=106.00, is_fixed_price=true

---

## Phase 4: Telegram-Integration

### Schritt 4.1: Webhook prüfen
```bash
curl https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/getWebhookInfo
```
**Erwartet:**
```json
{
  "ok": true,
  "result": {
    "url": "https://vvwtkkatgegcezfubhxx.supabase.co/functions/v1/telegram-bot",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Schritt 4.2: Telegram-Gruppe einrichten
1. In Telegram neue Gruppe erstellen: "Taxi Ostbahnhof Test"
2. Bot hinzufügen: @taxi_center_ost_bot
3. Bot als **Admin** ernennen
4. Schreibe Test-Nachricht in Gruppe

### Schritt 4.3: Gruppen-ID ermitteln
```bash
# Webhook kurz löschen
curl -X POST "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/deleteWebhook"

# Updates abrufen
curl https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/getUpdates
```

Suche nach: `"chat":{"id":-1001234567890`
→ **-1001234567890** ist die Gruppen-ID

### Schritt 4.4: Gruppen-ID speichern
```sql
UPDATE tenants 
SET telegram_group_id = -100XXXXXXXXXX  -- DEINE ID
WHERE slug = 'ostbahnhof';
```

### Schritt 4.5: Webhook wieder setzen
```bash
curl -X POST "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://vvwtkkatgegcezfubhxx.supabase.co/functions/v1/telegram-bot"}'
```

---

## Phase 5: End-to-End Test

### Schritt 5.1: Test-Buchung erstellen
Im Supabase SQL Editor:
```sql
INSERT INTO bookings (
    tenant_id,
    pickup_datetime,
    pickup_address,
    pickup_district,
    destination_address,
    price_total,
    vehicle_type,
    customer_name,
    customer_phone,
    status
) VALUES (
    (SELECT id FROM tenants WHERE slug = 'ostbahnhof'),
    NOW() + INTERVAL '2 hours',
    'Marienplatz 1, 80331 München',
    'Altstadt-Lehel',
    'Flughafen München (MUC)',
    106.00,
    'standard',
    'Test-Kunde Max',
    '+49 171 12345678',
    'pending'
) RETURNING id, booking_number;
```

Merke dir die `booking_number` (z.B. "25-000042")

### Schritt 5.2: An Telegram senden
Im Admin Dashboard:
1. http://localhost:5173/admin öffnen
2. Buchung suchen (z.B. "25-000042")
3. Auf "An Telegram senden" klicken

### Schritt 5.3: Telegram prüfen
In der Telegram-Gruppe sollte erscheinen:
```
🚕 NEUER AUFTRAG

📋 Buchung: #25-000042
🕐 Abholung: Fr, 28.03. 14:30
📍 Stadtteil: Altstadt-Lehel
🚗 Fahrzeug: Standard (bis 4 Pers.)
💶 Preis: ca. 106,00 €
🏷️ Festpreis: Hbf ↔ Flughafen

⬇️ Zum Annehmen Button drücken
[✅ ANNEHMEN]
```

**Wichtig:** Keine Kundendaten sichtbar!

### Schritt 5.4: Als Fahrer annehmen
1. In Telegram auf **[✅ ANNEHMEN]** klicken
2. Prüfe:
   - [ ] Nachricht ändert sich zu "Vergeben an..."
   - [ ] Private Nachricht erhältlich
   - [ ] Private Nachricht enthält:
     - Name: Test-Kunde Max
     - Telefon: +49 171 12345678
     - Abholadresse: Marienplatz 1, 80331 München
     - Ziel: Flughafen München (MUC)

### Schritt 5.5: Datenbank prüfen
```sql
-- Gebühr sollte eingetragen sein
SELECT booking_number, status, assigned_driver_id, brokerage_fee_amount 
FROM bookings 
WHERE booking_number = '25-000042';
```
**Erwartet:**
- status: 'claimed'
- assigned_driver_id: nicht null
- brokerage_fee_amount: 5.30 (5% von 106,00)

---

## Phase 6: Security-Tests

### Test 6.1: Kein Service-Role im Client
```bash
# Suche nach Service-Role im src-Ordner
grep -r "SERVICE_ROLE" src/ --include="*.ts" --include="*.tsx"
```
**Erwartet:** Keine Treffer (außer möglicherweise in Kommentaren)

### Test 6.2: API-Layer wird genutzt
```bash
# Prüfe ob direkte supabase.from Calls in Pages existieren
grep -r "supabase\.from" src/pages/ --include="*.tsx"
```
**Erwartet:** Keine Treffer (alle gehen über `api.bookings.`)

### Test 6.3: RLS aktiv
Im Supabase Dashboard:
1. Database → Tables
2. bookings → Policies
3. Prüfe: Policy "tenant_isolation" vorhanden

---

## Phase 7: Performance-Tests

### Test 7.1: Lighthouse (Chrome)
1. http://localhost:5173/ öffnen
2. F12 → Lighthouse
3. "Analyze page load"

**Erwartete Werte:**
| Metrik | Mindestwert |
|--------|-------------|
| Performance | > 70 |
| Accessibility | > 90 |
| Best Practices | > 90 |
| SEO | > 90 |

### Test 7.2: API-Response-Zeiten
Im Browser Network Tab:
- Buchungen laden: < 500ms
- Preisberechnung: < 100ms

---

## ✅ Go-Live Entscheidung

### Alle Tests bestanden?
- [ ] Phase 1: Build & Lint
- [ ] Phase 2: Frontend
- [ ] Phase 3: Datenbank
- [ ] Phase 4: Telegram Setup
- [ ] Phase 5: End-to-End
- [ ] Phase 6: Security
- [ ] Phase 7: Performance

### Falls JA → Deployment
```bash
# Build erstellen
npm run build

# Deploy (je nach Hosting)
# - Vercel: vercel --prod
# - Netlify: netlify deploy --prod
# - Oder dist/ Ordner manuell hochladen
```

### Falls NEIN → Issues dokumentieren
In `TEST_ISSUES.md` notieren:
- Welcher Test fehlgeschlagen?
- Fehlermeldung kopieren
- Lösungsansatz?

---

**Test durchgeführt von:** ___________
**Datum:** ___________
**Go-Live genehmigt:** ⬜ JA / ⬜ NEIN
