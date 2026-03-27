#!/bin/bash
# =============================================================================
# TELEGRAM BOT SETUP SCRIPT
# Konfiguriert den Webhook für den Taxi-Management-Bot
# =============================================================================

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Konfiguration
BOT_TOKEN="8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM"
SUPABASE_PROJECT_ID=""

echo -e "${GREEN}=== Taxi Center Ostbahnhof - Telegram Bot Setup ===${NC}"
echo ""

# Supabase Projekt ID abfragen
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    read -p "Supabase Project ID (z.B. abcdefghijklmnopqrst): " SUPABASE_PROJECT_ID
fi

WEBHOOK_URL="https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-bot"

echo ""
echo -e "${YELLOW}Konfiguration:${NC}"
echo "  Bot Token: ${BOT_TOKEN:0:20}..."
echo "  Webhook URL: $WEBHOOK_URL"
echo ""

# Bot-Info abrufen
echo -e "${GREEN}1. Bot-Info wird abgerufen...${NC}"
BOT_INFO=$(curl -s -X GET "https://api.telegram.org/bot${BOT_TOKEN}/getMe")

if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_NAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    echo -e "  ${GREEN}✓ Bot gefunden:@${BOT_NAME}${NC}"
else
    echo -e "  ${RED}✗ Fehler beim Abrufen der Bot-Info${NC}"
    echo "  Response: $BOT_INFO"
    exit 1
fi

# Webhook setzen
echo ""
echo -e "${GREEN}2. Webhook wird konfiguriert...${NC}"
WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -d "url=${WEBHOOK_URL}" \
    -d "max_connections=40" \
    -d "allowed_updates=[\"callback_query\",\"message\"]")

if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
    echo -e "  ${GREEN}✓ Webhook erfolgreich gesetzt${NC}"
else
    echo -e "  ${RED}✗ Fehler beim Setzen des Webhooks${NC}"
    echo "  Response: $WEBHOOK_RESPONSE"
    exit 1
fi

# Webhook-Info anzeigen
echo ""
echo -e "${GREEN}3. Webhook-Konfiguration wird überprüft...${NC}"
WEBHOOK_INFO=$(curl -s -X GET "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
PENDING_UPDATES=$(echo "$WEBHOOK_INFO" | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2)

echo "  Pending updates: $PENDING_UPDATES"
echo ""

# Erfolgsmeldung
echo -e "${GREEN}=== Setup erfolgreich abgeschlossen! ===${NC}"
echo ""
echo "Nächste Schritte:"
echo "  1. Bot zu Telegram-Gruppe hinzufügen:@${BOT_NAME}"
echo "  2. Bot als Admin in der Gruppe ernennen"
echo "  3. Gruppen-ID in Supabase Datenbank speichern"
echo "  4. Edge Function deployen: supabase functions deploy telegram-bot"
echo ""
echo "Hilfreiche Befehle:"
echo "  Webhook löschen:  curl -X POST \"https://api.telegram.org/bot${BOT_TOKEN:0:20}.../deleteWebhook\""
echo "  Updates abrufen:  curl -X GET \"https://api.telegram.org/bot${BOT_TOKEN:0:20}.../getUpdates\""
echo ""
