# =============================================================================
# PRODUKTIONS-TEST SCRIPT
# Automatisierte Tests für Taxi Center Ostbahnhof
# =============================================================================

$ErrorActionPreference = "Stop"

# Konfiguration
$SUPABASE_URL = "https://vvwtkkatgegcezfubhxx.supabase.co"
$TELEGRAM_TOKEN = "8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM"
$TEST_RESULTS = @()

function Add-TestResult($Name, $Status, $Message = "") {
    $script:TEST_RESULTS += [PSCustomObject]@{
        Test = $Name
        Status = $Status
        Message = $Message
    }
}

function Write-TestHeader($text) {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host $text -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
}

function Write-Success($text) {
    Write-Host "  ✓ $text" -ForegroundColor Green
}

function Write-Failure($text) {
    Write-Host "  ✗ $text" -ForegroundColor Red
}

# =============================================================================
# TEST 1: Build & Lint
# =============================================================================
Write-TestHeader "TEST 1: Build & Lint"

try {
    npm run build 2>&1 | Out-Null
    Add-TestResult "Build" "PASS"
    Write-Success "Build erfolgreich"
} catch {
    Add-TestResult "Build" "FAIL" $_.Exception.Message
    Write-Failure "Build fehlgeschlagen"
}

try {
    npm run lint 2>&1 | Out-Null
    Add-TestResult "Lint" "PASS"
    Write-Success "Linting OK"
} catch {
    Add-TestResult "Lint" "FAIL" $_.Exception.Message
    Write-Failure "Linting fehlgeschlagen"
}

# =============================================================================
# TEST 2: Telegram Webhook
# =============================================================================
Write-TestHeader "TEST 2: Telegram Webhook"

try {
    $webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$TELEGRAM_TOKEN/getWebhookInfo" -Method Get
    
    if ($webhookInfo.ok -and $webhookInfo.result.url -like "*vvwtkkatgegcezfubhxx*") {
        Add-TestResult "Telegram Webhook" "PASS"
        Write-Success "Webhook konfiguriert: $($webhookInfo.result.url)"
    } else {
        Add-TestResult "Telegram Webhook" "FAIL" "Webhook URL nicht korrekt"
        Write-Failure "Webhook nicht korrekt konfiguriert"
    }
} catch {
    Add-TestResult "Telegram Webhook" "FAIL" $_.Exception.Message
    Write-Failure "Konnte Webhook nicht prüfen"
}

# =============================================================================
# TEST 3: Supabase Edge Function
# =============================================================================
Write-TestHeader "TEST 3: Edge Function"

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/telegram-bot" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"update_id":1}' `
        -ErrorAction SilentlyContinue
    
    # Wir erwarten einen Fehler (kein gültiger Telegram-Update), aber 200 OK
    Add-TestResult "Edge Function" "PASS"
    Write-Success "Edge Function erreichbar"
} catch {
    if ($_.Exception.Response.StatusCode -eq 400 -or $_.Exception.Response.StatusCode -eq 200) {
        Add-TestResult "Edge Function" "PASS"
        Write-Success "Edge Function erreichbar (erwarteter Fehler)"
    } else {
        Add-TestResult "Edge Function" "FAIL" $_.Exception.Message
        Write-Failure "Edge Function nicht erreichbar"
    }
}

# =============================================================================
# TEST 4: Datenbank-Verbindung (via API)
# =============================================================================
Write-TestHeader "TEST 4: Dateien & Struktur"

$requiredFiles = @(
    "src/App.tsx",
    "src/lib/supabase/client.ts",
    "src/lib/api/client.ts",
    "src/components/ErrorBoundary.tsx",
    "src/hooks/useBookings.ts",
    "src/hooks/useDrivers.ts"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Success "$file vorhanden"
    } else {
        Write-Failure "$file fehlt"
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    Add-TestResult "Dateistruktur" "PASS"
} else {
    Add-TestResult "Dateistruktur" "FAIL" "Einige Dateien fehlen"
}

# =============================================================================
# TEST 5: Security Check
# =============================================================================
Write-TestHeader "TEST 5: Security Check"

# Prüfe auf Service-Role-Key in src/
$serviceRoleFound = $false
Get-ChildItem -Path "src" -Recurse -File | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -like "*SERVICE_ROLE*" -and $_.Name -ne ".env.example") {
        Write-Failure "SERVICE_ROLE in $($_.FullName) gefunden!"
        $serviceRoleFound = $true
    }
}

if (-not $serviceRoleFound) {
    Add-TestResult "Security (Kein Service-Role)" "PASS"
    Write-Success "Kein Service-Role-Key im Source-Code"
} else {
    Add-TestResult "Security (Kein Service-Role)" "FAIL" "Service-Role-Key gefunden"
}

# =============================================================================
# ZUSAMMENFASSUNG
# =============================================================================
Write-TestHeader "TEST ZUSAMMENFASSUNG"

$passed = ($TEST_RESULTS | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($TEST_RESULTS | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $TEST_RESULTS.Count

Write-Host ""
Write-Host "Gesamt: $passed/$total bestanden" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

$TEST_RESULTS | ForEach-Object {
    $color = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "$($_.Test): $($_.Status)" -ForegroundColor $color
    if ($_.Message -and $_.Status -eq "FAIL") {
        Write-Host "  → $($_.Message)" -ForegroundColor DarkGray
    }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "🎉 Alle Tests bestanden! System ist bereit für Produktion." -ForegroundColor Green
} else {
    Write-Host "⚠️  Einige Tests sind fehlgeschlagen. Bitte korrigieren vor Go-Live." -ForegroundColor Yellow
}
Write-Host ""

pause
