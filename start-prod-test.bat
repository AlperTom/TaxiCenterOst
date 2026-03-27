@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   TAXI CENTER OSTBAHNHOF
echo   Produktions-Test Starten
echo ========================================
echo.
echo Dieses Script führt dich durch alle Tests.
echo.

:: Prüfe ob npm verfügbar ist
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] npm nicht gefunden!
    echo Bitte installiere Node.js von https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] npm gefunden
echo.

:: Schritt 1: Dependencies
echo ========================================
echo Schritt 1: Dependencies installieren
echo ========================================
echo.
cd /d "C:\Users\Alper\OneDrive\Tombulca\2026\TaxiCenterOst"
call npm install
if %errorlevel% neq 0 (
    echo [FEHLER] npm install fehlgeschlagen
    pause
    exit /b 1
)
echo [OK] Dependencies installiert
echo.

:: Schritt 2: Build
echo ========================================
echo Schritt 2: Build testen
echo ========================================
echo.
call npm run build
if %errorlevel% neq 0 (
    echo [FEHLER] Build fehlgeschlagen
    pause
    exit /b 1
)
echo [OK] Build erfolgreich
echo.

:: Schritt 3: Lint
echo ========================================
echo Schritt 3: Linting testen
echo ========================================
echo.
call npm run lint
if %errorlevel% neq 0 (
    echo [WARNUNG] Linting hat Fehler (nicht kritisch)
) else (
    echo [OK] Linting erfolgreich
)
echo.

:: Schritt 4: Dev Server starten
echo ========================================
echo Schritt 4: Dev-Server starten
echo ========================================
echo.
echo Der Server wird gestartet...
echo Bitte warte bis "ready in" erscheint.
echo.
echo Danach:
echo   - http://localhost:5173/        (Landing Page)
echo   - http://localhost:5173/admin   (Admin Dashboard)
echo.
echo Öffne PROD_TEST_CHECKLIST.md für alle Test-Schritte!
echo.
start "" "PROD_TEST_CHECKLIST.md"
call npm run dev

pause
