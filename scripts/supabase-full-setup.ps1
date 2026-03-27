# =============================================================================
# SUPABASE KOMPLETT-SETUP
# Projekt: vvwtkkatgegcezfubhxx (Taxi Center Ostbahnhof)
# =============================================================================

$ErrorActionPreference = "Stop"

# Konfiguration
$SUPABASE_URL = "https://vvwtkkatgegcezfubhxx.supabase.co"
$SUPABASE_PROJECT_ID = "vvwtkkatgegcezfubhxx"
$TELEGRAM_TOKEN = "8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  TAXI CENTER OSTBAHNHOF - Supabase Setup" -ForegroundColor Cyan
Write-Host "  Projekt: $SUPABASE_PROJECT_ID" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Pruefe ob Supabase CLI installiert ist
Write-Host "1. Pruefe Supabase CLI..." -ForegroundColor Green
try {
    $supabaseVersion = supabase --version
    Write-Host "   Supabase CLI gefunden: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "   Supabase CLI nicht gefunden!" -ForegroundColor Red
    Write-Host "   Installiere mit: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Login (falls nicht bereits eingeloggt)
Write-Host ""
Write-Host "2. Supabase Login..." -ForegroundColor Green
Write-Host "   (Oeffnet Browser fuer Authentifizierung)" -ForegroundColor Yellow
supabase login

# Link zum Projekt
Write-Host ""
Write-Host "3. Verbinde mit Projekt $SUPABASE_PROJECT_ID..." -ForegroundColor Green
try {
    supabase link --project-ref $SUPABASE_PROJECT_ID
    Write-Host "   Projekt verknuepft" -ForegroundColor Green
} catch {
    Write-Host "   Fehler beim Verknuepfen: $_" -ForegroundColor Red
    exit 1
}

# Setze Secrets
Write-Host ""
Write-Host "4. Setze Umgebungsvariablen (Secrets)..." -ForegroundColor Green
try {
    supabase secrets set TELEGRAM_BOT_TOKEN="$TELEGRAM_TOKEN"
    Write-Host "   TELEGRAM_BOT_TOKEN gesetzt" -ForegroundColor Green
} catch {
    Write-Host "   Fehler beim Setzen der Secrets: $_" -ForegroundColor Red
}

# Datenbank-Migrationen
Write-Host ""
Write-Host "5. Fuehre Datenbank-Migrationen aus..." -ForegroundColor Green
try {
    supabase db push
    Write-Host "   Migrationen erfolgreich" -ForegroundColor Green
} catch {
    Write-Host "   Fehler bei Migrationen: $_" -ForegroundColor Red
    Write-Host "   Versuche manuelles Setup..." -ForegroundColor Yellow
}

# Edge Function deployen
Write-Host ""
Write-Host "6. Deploye Edge Function 'telegram-bot'..." -ForegroundColor Green
try {
    supabase functions deploy telegram-bot
    Write-Host "   Edge Function deployt" -ForegroundColor Green
} catch {
    Write-Host "   Fehler beim Deployen: $_" -ForegroundColor Red
}

# Telegram Webhook konfigurieren
Write-Host ""
Write-Host "7. Konfiguriere Telegram Webhook..." -ForegroundColor Green
$WEBHOOK_URL = "https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/telegram-bot"

try {
    # Bot Info abrufen
    $botInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$TELEGRAM_TOKEN/getMe" -Method GET
    if ($botInfo.ok) {
        Write-Host "   Bot gefunden:@$($botInfo.result.username)" -ForegroundColor Green
        
        # Webhook setzen
        $body = @{
            url = $WEBHOOK_URL
            max_connections = 40
            allowed_updates = '["callback_query","message"]'
        } | ConvertTo-Json
        
        $webhookResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$TELEGRAM_TOKEN/setWebhook" -Method POST -ContentType "application/json" -Body $body
        
        if ($webhookResponse.ok) {
            Write-Host "   Webhook konfiguriert" -ForegroundColor Green
            Write-Host "   URL: $WEBHOOK_URL" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "   Fehler bei Telegram-Konfiguration: $_" -ForegroundColor Red
}

# Zusammenfassung
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  SETUP ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Naechste Schritte:" -ForegroundColor Yellow
Write-Host "1. Oeffne Supabase Dashboard:" -ForegroundColor White
Write-Host "   $SUPABASE_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Fuehre setup-database.sql im SQL Editor aus" -ForegroundColor White
Write-Host ""
Write-Host "3. Erstelle eine Telegram-Gruppe:" -ForegroundColor White
Write-Host "   - Fuege @taxi_center_ost_bot hinzu" -ForegroundColor White
Write-Host "   - Mache Bot zum Admin" -ForegroundColor White
Write-Host "   - Ermittle Gruppen-ID und trage in DB ein" -ForegroundColor White
Write-Host ""
Write-Host "4. Fahrer registrieren:" -ForegroundColor White
Write-Host "   - Telegram User IDs ermitteln" -ForegroundColor White
Write-Host "   - In drivers-Tabelle eintragen" -ForegroundColor White
Write-Host ""
Write-Host "5. Frontend starten:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin Dashboard:" -ForegroundColor Yellow
Write-Host "   http://localhost:5173/admin" -ForegroundColor Cyan
Write-Host ""

Read-Host "Druecke Enter zum Beenden"
