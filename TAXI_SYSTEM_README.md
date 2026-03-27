# Taxi-Management-System "Ostbahnhof"

## Übersicht

Eine mandantenfähige Plattform für Taxi-Unternehmen mit BOKraft-konformer Münchner Tarifberechnung und zweistufigem Telegram-Workflow.

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Kunden-     │  │  Admin-      │  │  Fahrer-             │  │
│  │  Buchung     │  │  Dashboard   │  │  (Telegram Bot)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE PLATFORM                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │  Edge        │  │  Realtime            │  │
│  │  Database    │  │  Functions   │  │  Subscriptions       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT API                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Gruppen-    │  │  Private     │  │  Webhook             │  │
│  │  Nachricht   │  │  Nachricht   │  │  Handler             │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Kern-Funktionen

### 1. Münchner Tarif-Engine (BOKraft-konform)

```typescript
import { MunichTariffEngine } from '@/lib/pricing/munich-tariff';

// Preisberechnung
const result = MunichTariffEngine.calculatePrice({
  distanceKm: 25,
  passengerCount: 5,
  hasBicycle: true,
  pickupLat: 48.1402,
  pickupLng: 11.5610,
  destinationLat: 48.3539,
  destinationLng: 11.7861,
});

// Ergebnis:
// {
//   breakdown: {
//     baseFare: 5.90,
//     distanceFare: 67.50,
//     waitingFare: 0,
//     surcharges: { passengers5plus: 10.00, bicycle: 7.50, total: 17.50 },
//     fixedPrice: null,
//     fixedRouteType: null,
//     subtotal: 73.40,
//     total: 90.90
//   },
//   isFixedPrice: false,
//   distanceKm: 25,
//   estimatedDurationMin: 27
// }
```

**Offizieller Tarif München:**
- Grundpreis: 5,90 €
- Kilometerpreis: 2,70 €
- Wartezeit: 39,00 €/Std.
- Zuschlag 5.+ Fahrgast: 10,00 €
- Zuschlag Fahrrad: 7,50 €

**Festpreise:**
- Flughafen ↔ Messe: 94,00 €
- Hbf ↔ Flughafen: 106,00 €
- Hbf ↔ Messe: 43,00 €

### 2. Zweistufiger Telegram-Workflow

```
Phase 1: ANONYM (Gruppe)
┌─────────────────────────────────────┐
│ 🚕 NEUER AUFTRAG                    │
│                                     │
│ 📋 Buchung: #25-000001              │
│ 🕐 Abholung: Fr, 27.03. 15:30       │
│ 📍 Stadtteil: Ludwigsvorstadt       │
│ 🚗 Fahrzeug: XL (bis 6 Pers.)       │
│ 💶 Preis: ca. 60,50 €               │
│                                     │
│ ⬇️ Zum Annehmen Button drücken      │
│ [✅ ANNEHMEN]                       │
└─────────────────────────────────────┘

Phase 2: CLAIM (Button-Druck)
→ Buchung wird gesperrt
→ Nur dieser Fahrer sieht Details

Phase 3: PRIVAT (DM an Fahrer)
┌─────────────────────────────────────┐
│ ✅ AUFTRAG BESTÄTIGT                │
│                                     │
│ 👤 Kunde: Max Mustermann            │
│ 📞 Telefon: +49 171 12345678        │
│                                     │
│ 📍 Abholadresse:                    │
│ Hauptbahnhof, 80335 München         │
│                                     │
│ 💶 Preis: 60,50 €                   │
└─────────────────────────────────────┘
```

### 3. Gebühren-Logik

| Zuweisungsart | Vermittlungsgebühr |
|--------------|-------------------|
| Telegram (Fahrer klickt) | **5%** |
| Manuell (Backoffice) | **0%** |

### 4. Datenschutz & Audit-Log

Alle Statusänderungen werden protokolliert:

```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'booking' 
AND entity_id = '...' 
ORDER BY created_at DESC;

-- actor_type | action                  | old_values           | new_values
-- -----------|-------------------------|----------------------|-------------------
-- system     | booking_created         | null                 | {status: pending}
-- system     | booking_broadcast_telegram | {status: pending} | {status: telegram_broadcast}
-- driver     | booking_claimed_telegram   | {status: telegram_broadcast} | {status: claimed, assigned_driver_id: ...}
```

## Datenbank-Schema

### Tabellen

| Tabelle | Beschreibung |
|---------|-------------|
| `tenants` | Mandanten/Firmen mit individueller Konfiguration |
| `drivers` | Fahrer mit Telegram-Integration |
| `bookings` | Buchungen mit detaillierter Preisaufschlüsselung |
| `audit_logs` | Strikte Nachvollziehbarkeit aller Änderungen |
| `brokerage_fees` | Vermittlungsgebühren-Tracking pro Fahrt |
| `admin_users` | Backoffice-Benutzer |

### Row Level Security (RLS)

```sql
-- Jeder Mandant sieht nur seine eigenen Daten
CREATE POLICY tenant_isolation ON bookings
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

## API-Endpunkte

### Edge Functions

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/telegram-bot` | POST | Webhook für Telegram Callbacks |

### RPC-Funktionen

| Funktion | Beschreibung |
|----------|-------------|
| `claim_booking` | Atomares Claimen durch Fahrer (mit 5% Gebühr) |
| `assign_booking_manual` | Manuelle Zuweisung durch Admin (0% Gebühr) |
| `broadcast_to_telegram` | Buchung an Telegram-Gruppe senden |
| `mark_brokerage_fee_paid` | Gebühren als bezahlt markieren |
| `calculate_munich_price` | Preisberechnung nach Münchner Tarif |

## Setup

### 1. Supabase Konfiguration

```bash
# Migrationen ausführen
supabase db reset

# Edge Function deployen
supabase functions deploy telegram-bot

# Umgebungsvariablen setzen
supabase secrets set TELEGRAM_BOT_TOKEN=your_token_here
```

### 2. Telegram Bot Einrichtung

1. [@BotFather](https://t.me/botfather) starten
2. `/newbot` → Namen vergeben
3. Token in Supabase Secrets hinterlegen
4. Bot zur Gruppe hinzufügen
5. Gruppen-ID ermitteln:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getUpdates
   ```

### 3. Frontend

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Build
npm run build
```

## Admin Dashboard

Das Dashboard bietet:

- **Buchungsübersicht** mit allen Details
- **Rechnungsanfragen** (markiert mit 📄)
- **Fahrer-Verwaltung** mit Gebühren-Tracking
- **Echtzeit-Updates** via Supabase Realtime

## Multi-Tenant Fähigkeit

Das System unterstützt mehrere Taxi-Unternehmen:

```typescript
// Tenant-Konfiguration
const tenant = {
  slug: 'ostbahnhof',
  name: 'Taxi Center Ostbahnhof',
  pricing_config: {
    base_fare: 5.90,
    km_rate: 2.70,
    // ...
  },
  telegram_group_id: -123456789,
};
```

Jeder Mandant hat:
- Eigene Telegram-Gruppe
- Individuelle Tarif-Konfiguration
- Isolierte Daten (RLS)

## Sicherheit

- **Datenschutz**: Kundendaten erst nach Claim sichtbar
- **Audit-Logging**: Jede Änderung nachvollziehbar
- **RLS**: Mandanten-isolierte Daten
- **Atomare Operationen**: Keine Race Conditions beim Claimen

## Lizenz

Proprietär - Taxi Center Ostbahnhof GmbH
