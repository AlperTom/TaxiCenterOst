# =============================================================================
# VERCEL DEPLOYMENT DIAGNOSE
# Sammelt alle Informationen für Troubleshooting
# =============================================================================

$ErrorActionPreference = "Continue"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  VERCEL DEPLOYMENT DIAGNOSE" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$Report = @()

# 1. Lokale Build-Test
Write-Host "[1/6] Lokaler Build-Test..." -ForegroundColor Yellow
Set-Location "C:\Users\Alper\OneDrive\Tombulca\2026\TaxiCenterOst"

try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Build erfolgreich" -ForegroundColor Green
        $Report += "LOCAL_BUILD: SUCCESS"
    } else {
        Write-Host "  ✗ Build fehlgeschlagen" -ForegroundColor Red
        $Report += "LOCAL_BUILD: FAILED"
        $Report += "BUILD_ERROR: $buildOutput"
    }
} catch {
    Write-Host "  ✗ Fehler: $_" -ForegroundColor Red
    $Report += "LOCAL_BUILD: ERROR - $_"
}
Write-Host ""

# 2. Environment Variablen prüfen
Write-Host "[2/6] Environment Variablen..." -ForegroundColor Yellow

$envFiles = @(".env", ".env.local", ".env.production")
foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file existiert" -ForegroundColor Green
        $content = Get-Content $file -Raw
        
        # Prüfe auf VITE_ Prefix
        $hasVitePrefix = $content -match "VITE_"
        if ($hasVitePrefix) {
            Write-Host "    → VITE_ Variablen gefunden" -ForegroundColor Gray
        }
        
        # Liste Variablen (ohne Werte)
        $vars = $content | Select-String "^VITE_[A-Z_]+" | ForEach-Object { $_.Matches.Value }
        if ($vars) {
            Write-Host "    Variablen: $($vars -join ', ')" -ForegroundColor Gray
        }
        $Report += "ENV_FILE_${file}: EXISTS, VARS: $($vars -join ',')"
    } else {
        Write-Host "  ✗ $file nicht gefunden" -ForegroundColor Red
        $Report += "ENV_FILE_${file}: MISSING"
    }
}
Write-Host ""

# 3. vercel.json prüfen
Write-Host "[3/6] vercel.json Konfiguration..." -ForegroundColor Yellow
if (Test-Path "vercel.json") {
    Write-Host "  ✓ vercel.json existiert" -ForegroundColor Green
    $vercelConfig = Get-Content "vercel.json" -Raw | ConvertFrom-Json
    
    if ($vercelConfig.rewrites) {
        Write-Host "    → SPA Rewrites konfiguriert" -ForegroundColor Green
        $Report += "VERCEL_JSON: REWRITES_OK"
    } else {
        Write-Host "    ✗ Keine Rewrites gefunden!" -ForegroundColor Red
        $Report += "VERCEL_JSON: NO_REWRITES"
    }
    
    Write-Host "    Framework: $($vercelConfig.framework)" -ForegroundColor Gray
    Write-Host "    Build Command: $($vercelConfig.buildCommand)" -ForegroundColor Gray
    Write-Host "    Output Directory: $($vercelConfig.outputDirectory)" -ForegroundColor Gray
} else {
    Write-Host "  ✗ vercel.json NICHT GEFUNDEN!" -ForegroundColor Red
    $Report += "VERCEL_JSON: MISSING"
}
Write-Host ""

# 4. dist/ Ordner prüfen
Write-Host "[4/6] Build-Output prüfen..." -ForegroundColor Yellow
if (Test-Path "dist") {
    $files = Get-ChildItem "dist" -File | Select-Object -First 10
    Write-Host "  ✓ dist/ Ordner existiert" -ForegroundColor Green
    Write-Host "    Dateien: $($files.Name -join ', ')" -ForegroundColor Gray
    
    if (Test-Path "dist\index.html") {
        Write-Host "    ✓ index.html vorhanden" -ForegroundColor Green
        $Report += "DIST_INDEX: EXISTS"
    } else {
        Write-Host "    ✗ index.html FEHLT!" -ForegroundColor Red
        $Report += "DIST_INDEX: MISSING"
    }
} else {
    Write-Host "  ✗ dist/ Ordner nicht gefunden" -ForegroundColor Red
    $Report += "DIST_FOLDER: MISSING"
}
Write-Host ""

# 5. package.json Scripts
Write-Host "[5/6] package.json Scripts..." -ForegroundColor Yellow
$package = Get-Content "package.json" | ConvertFrom-Json
Write-Host "  Build: $($package.scripts.build)" -ForegroundColor Gray
Write-Host "  Preview: $($package.scripts.preview)" -ForegroundColor Gray
$Report += "BUILD_SCRIPT: $($package.scripts.build)"
Write-Host ""

# 6. Vercel Projekt Info
Write-Host "[6/6] Vercel Projekt Info..." -ForegroundColor Yellow
Write-Host "  (Bitte manuell prüfen auf https://vercel.com/dashboard)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Zu prüfen:" -ForegroundColor Cyan
Write-Host "    1. Project → Settings" -ForegroundColor White
Write-Host "    2. Environment Variables" -ForegroundColor White
Write-Host "    3. Build & Development Settings" -ForegroundColor White
Write-Host "    4. Letzte Deployment Logs" -ForegroundColor White
Write-Host ""

# Report speichern
$Report += ""
$Report += "=== DIAGNOSE KOMPLETT ==="
$Report += "Timestamp: $(Get-Date)"
$reportPath = "vercel-diagnose-report.txt"
$Report | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "================================" -ForegroundColor Cyan
Write-Host "DIAGNOSE GESPEICHERT IN:" -ForegroundColor Cyan
Write-Host $reportPath -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Zeige Report
Write-Host "ZUSAMMENFASSUNG:" -ForegroundColor Yellow
$Report | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "NÄCHSTE SCHRITTE:" -ForegroundColor Green
Write-Host "1. Kopiere diese Ausgabe und sende sie mir" -ForegroundColor White
Write-Host "2. Oder öffne $reportPath" -ForegroundColor White
Write-Host "3. Prüfe Vercel Dashboard auf Fehler-Logs" -ForegroundColor White
Write-Host ""

pause
