# =============================================================================
# ROLLBACK SCRIPT
# Notfall-Rollback auf vorherige Version
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Red
Write-Host "  ⚠️  ROLLBACK VERFAHREN" -ForegroundColor Red
Write-Host "================================" -ForegroundColor Red
Write-Host ""

Write-Host "Dieses Script führt ein Rollback auf die letzte stabile Version durch." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Möchtest du fortfahren? (ja/NEIN)"
if ($confirm -ne "ja") {
    Write-Host "Rollback abgebrochen." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Schritt 1: Git Rollback..." -ForegroundColor Cyan

try {
    # Finde letzten stabilen Commit
    $lastStable = git log --oneline --all | Select-Object -First 5
    Write-Host "Letzte 5 Commits:" -ForegroundColor Gray
    $lastStable | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    
    Write-Host ""
    $commit = Read-Host "Gib den Commit-Hash für Rollback ein (oder 'abort')"
    
    if ($commit -eq "abort") {
        Write-Host "Rollback abgebrochen." -ForegroundColor Green
        exit 0
    }
    
    git reset --hard $commit
    Write-Host "✓ Git Rollback durchgeführt" -ForegroundColor Green
} catch {
    Write-Host "✗ Git Rollback fehlgeschlagen: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Schritt 2: Supabase Rollback..." -ForegroundColor Cyan
Write-Host "(Manuelle Schritte im Supabase Dashboard erforderlich)" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Öffne: https://vvwtkkatgegcezfubhxx.supabase.co/project/database/backups"
Write-Host "2. Wähle einen Backup-Zeitpunkt vor dem Deployment"
Write-Host "3. Klicke 'Restore'"
Write-Host ""

$confirm2 = Read-Host "Backup wiederhergestellt? (ja/NEIN)"
if ($confirm2 -ne "ja") {
    Write-Host "⚠️  Bitte Backup manuell wiederherstellen!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Schritt 3: Telegram Webhook prüfen..." -ForegroundColor Cyan

$TELEGRAM_TOKEN = "8748467534:AAH8cLTejHIDsKTnlZ0qbhu0fIsSZ12zISM"
$webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$TELEGRAM_TOKEN/getWebhookInfo" -Method Get
Write-Host "Aktueller Webhook: $($webhookInfo.result.url)" -ForegroundColor Gray

Write-Host ""
Write-Host "================================" -ForegroundColor Red
Write-Host "  ROLLBACK ABGESCHLOSSEN" -ForegroundColor Red
Write-Host "================================" -ForegroundColor Red
Write-Host ""
Write-Host "Bitte überprüfe:" -ForegroundColor Yellow
Write-Host "  [ ] Website lädt korrekt"
Write-Host "  [ ] Admin Dashboard funktioniert"
Write-Host "  [ ] Telegram Integration läuft"
Write-Host "  [ ] Datenbank-Konsistenz OK"
Write-Host ""

pause
