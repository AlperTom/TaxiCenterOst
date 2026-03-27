# =============================================================================
# TELEGRAM BOT SETUP SCRIPT (PowerShell)
# Konfiguriert den Webhook für den Taxi-Management-Bot
# =============================================================================

# Konfiguration
$BOT_TOKEN = "8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM"

Write-Host "=== Taxi Center Ostbahnhof - Telegram Bot Setup ===" -ForegroundColor Green
Write-Host ""

# Supabase Projekt ID abfragen
$SUPABASE_PROJECT_ID = Read-Host "Supabase Project ID (z.B. abcdefghijklmnopqrst)"
$WEBHOOK_URL = "https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-bot"

Write-Host ""
Write-Host "Konfiguration:" -ForegroundColor Yellow
Write-Host "  Bot Token: $($BOT_TOKEN.Substring(0,20))..."
Write-Host "  Webhook URL: $WEBHOOK_URL"
Write-Host ""

# Bot-Info abrufen
Write-Host "1. Bot-Info wird abgerufen..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getMe" -Method GET
    if ($response.ok) {
        Write-Host "  ✓ Bot gefunden:@$($response.result.username)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Fehler beim Abrufen der Bot-Info" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ✗ Fehler: $_" -ForegroundColor Red
    exit 1
}

# Webhook setzen
Write-Host ""
Write-Host "2. Webhook wird konfiguriert..." -ForegroundColor Green
$body = @{
    url = $WEBHOOK_URL
    max_connections = 40
    allowed_updates = '["callback_query","message"]'
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" `
        -Method POST -ContentType "application/json" -Body $body
    if ($response.ok) {
        Write-Host "  ✓ Webhook erfolgreich gesetzt" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Fehler beim Setzen des Webhooks" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ✗ Fehler: $_" -ForegroundColor Red
    exit 1
}

# Webhook-Info anzeigen
Write-Host ""
Write-Host "3. Webhook-Konfiguration wird überprüft..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" -Method GET
    Write-Host "  Pending updates: $($response.result.pending_update_count)"
} catch {
    Write-Host "  Warnung: Konnte Webhook-Info nicht abrufen" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup erfolgreich abgeschlossen! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Nächste Schritte:"
Write-Host "  1. Bot zu Telegram-Gruppe hinzufügen"
Write-Host "  2. Bot als Admin in der Gruppe ernennen"
Write-Host "  3. Gruppen-ID in Supabase Datenbank speichern"
Write-Host "  4. Edge Function deployen: supabase functions deploy telegram-bot"
Write-Host ""
Write-Host "Hilfreiche Befehle:"
Write-Host "  Webhook löschen: Invoke-RestMethod -Uri \"https://api.telegram.org/bot.../deleteWebhook\" -Method POST"
Write-Host "  Updates abrufen: Invoke-RestMethod -Uri \"https://api.telegram.org/bot.../getUpdates\" -Method GET"
Write-Host ""

pause
