# Supabase Setup Guide

## 1. Telegram Bot Konfiguration

Der Bot wurde bereits erstellt mit folgendem Token:
```
8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM
```

### Schritte:

1. **Token als Secret in Supabase hinterlegen**:
```bash
supabase secrets set TELEGRAM_BOT_TOKEN="8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM"
```

2. **Bot in Telegram-Gruppe hinzufügen**:
   - Erstelle eine neue Gruppe in Telegram
   - Füge den Bot (@taxi_center_ost_bot) zur Gruppe hinzu
   - Mache den Bot zum Admin

3. **Gruppen-ID ermitteln**:
```bash
curl -X POST "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/getUpdates"
```

4. **Gruppen-ID in Datenbank speichern**:
```sql
UPDATE tenants 
SET telegram_group_id = -123456789
WHERE slug = 'ostbahnhof';
```

5. **Webhook setzen**:
```bash
curl -X POST "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/setWebhook" \
  -d "url=https://your-project.functions.supabase.co/telegram-bot"
```

## 2. Datenbank-Migrationen

```bash
# Migrationen ausführen
supabase db push

# Oder manuell über SQL Editor in Supabase Dashboard
```

## 3. Edge Function deployen

```bash
# Telegram Bot Function deployen
supabase functions deploy telegram-bot

# Funktion testen
supabase functions serve telegram-bot
```

## 4. Frontend-Umgebungsvariablen

Erstelle eine `.env` Datei im Projektroot:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

## 5. Test-Befehle

### Bot-Info abrufen:
```bash
curl -X GET "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/getMe"
```

### Webhook-Info:
```bash
curl -X GET "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/getWebhookInfo"
```

### Webhook löschen (für Testing):
```bash
curl -X POST "https://api.telegram.org/bot8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM/deleteWebhook"
```

## 6. Fahrer registrieren

Fahrer müssen ihre Telegram User ID mit dem System verknüpfen:

```sql
UPDATE drivers
SET 
    telegram_user_id = 12345678,
    telegram_username = 'fahrer_username',
    telegram_chat_id = 12345678,
    telegram_verified_at = NOW()
WHERE id = 'driver-uuid';
```

Die Chat-ID kann der Fahrer über @userinfobot ermitteln.

## Sicherheitshinweise

⚠️ **WICHTIG**: Der Bot Token wurde bereits als Umgebungsvariable konfiguriert. 
- Nie den Token im Frontend-Code verwenden
- Nie den Token in Git committen
- Token bei Verdacht auf Missbrauch sofort über @BotFather zurücksetzen
