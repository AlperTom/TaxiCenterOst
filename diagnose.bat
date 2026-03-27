@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   VERCEL DEPLOYMENT DIAGNOSE
echo ========================================
echo.
echo Dieses Script sammelt Diagnose-Informationen
echo.

cd /d "C:\Users\Alper\OneDrive\Tombulca\2026\TaxiCenterOst"

REM 1. Build Test
echo [1/5] Lokaler Build-Test...
echo     Starte npm run build...
call npm run build > build.log 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Build erfolgreich
echo BUILD: SUCCESS >> diagnose-report.txt
) else (
    echo     [FEHLER] Build fehlgeschlagen - siehe build.log
echo BUILD: FAILED >> diagnose-report.txt
type build.log >> diagnose-report.txt
)
echo.

REM 2. Environment Files
echo [2/5] Environment Files pruefen...
echo.
if exist ".env" (
    echo     [OK] .env existiert
    echo ENV_LOCAL: EXISTS >> diagnose-report.txt
) else (
    echo     [INFO] .env nicht gefunden
    echo ENV_LOCAL: MISSING >> diagnose-report.txt
)

if exist ".env.production" (
    echo     [OK] .env.production existiert
    type .env.production | findstr "VITE_" > nul
    if %errorlevel% equ 0 (
        echo           VITE_ Variablen gefunden
        echo ENV_PRODUCTION: EXISTS_WITH_VITE >> diagnose-report.txt
    ) else (
        echo           [WARNUNG] Keine VITE_ Variablen!
        echo ENV_PRODUCTION: EXISTS_NO_VITE >> diagnose-report.txt
    )
) else (
    echo     [WARNUNG] .env.production nicht gefunden
    echo ENV_PRODUCTION: MISSING >> diagnose-report.txt
)
echo.

REM 3. vercel.json
echo [3/5] vercel.json pruefen...
if exist "vercel.json" (
    echo     [OK] vercel.json existiert
    type vercel.json | findstr "rewrites" > nul
    if %errorlevel% equ 0 (
        echo           [OK] Rewrites konfiguriert
        echo VERCEL_JSON: OK >> diagnose-report.txt
    ) else (
        echo           [WARNUNG] Keine Rewrites gefunden
        echo VERCEL_JSON: NO_REWRITES >> diagnose-report.txt
    )
) else (
    echo     [FEHLER] vercel.json NICHT GEFUNDEN
    echo VERCEL_JSON: MISSING >> diagnose-report.txt
)
echo.

REM 4. dist Ordner
echo [4/5] Build Output pruefen...
if exist "dist" (
    echo     [OK] dist/ Ordner existiert
    if exist "dist\index.html" (
        echo           [OK] index.html vorhanden
        echo DIST_OUTPUT: OK >> diagnose-report.txt
    ) else (
        echo           [FEHLER] index.html fehlt
        echo DIST_OUTPUT: NO_INDEX >> diagnose-report.txt
    )
) else (
    echo     [FEHLER] dist/ Ordner nicht gefunden
    echo DIST_OUTPUT: MISSING >> diagnose-report.txt
)
echo.

REM 5. Package.json
echo [5/5] package.json Scripts...
type package.json | findstr "build" | findstr "preview" > nul
if %errorlevel% equ 0 (
    echo     [OK] Scripts gefunden
    echo PACKAGE_JSON: OK >> diagnose-report.txt
) else (
    echo     [WARNUNG] Scripts pruefen
    echo PACKAGE_JSON: CHECK >> diagnose-report.txt
)
echo.

REM Report speichern
echo. >> diagnose-report.txt
echo === DIAGNOSE KOMPLETT === >> diagnose-report.txt
echo Datum: %date% %time% >> diagnose-report.txt
echo. >> diagnose-report.txt
echo === VERCEL DASHBOARD INFOS === >> diagnose-report.txt
echo Bitte manuell pruefen auf: >> diagnose-report.txt
echo https://vercel.com/dashboard >> diagnose-report.txt
echo. >> diagnose-report.txt
echo Zu pruefen: >> diagnose-report.txt
echo - Build Logs (roter Fehler?) >> diagnose-report.txt
echo - Environment Variables >> diagnose-report.txt
echo - Framework Preset (Vite?) >> diagnose-report.txt
echo - Output Directory (dist?) >> diagnose-report.txt
echo - Install Command (npm install?) >> diagnose-report.txt

echo ========================================
echo   DIAGNOSE ABGESCHLOSSEN
echo ========================================
echo.
echo Dateien erstellt:
echo   - diagnose-report.txt (Zusammenfassung)
echo   - build.log (Build-Output falls Fehler)
echo.
echo WICHTIG:
echo Oeffne https://vercel.com/dashboard
echo und pruefe die Build-Logs!
echo.
echo Dann schicke mir:
echo 1. Inhalt von diagnose-report.txt
echo 2. Screenshot der Vercel-Fehlermeldung
echo.
pause
