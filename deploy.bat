@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   DEPLOY TO PRODUCTION
echo   unal.tombulca.de
echo ========================================
echo.

cd /d "C:\Users\Alper\OneDrive\Tombulca\2026\TaxiCenterOst"

:: Prüfe ob npm verfügbar
echo [1/5] Prüfe npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] npm nicht gefunden!
    pause
    exit /b 1
)
echo     OK
echo.

:: Dependencies
echo [2/5] Installiere Dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [FEHLER] npm install fehlgeschlagen
    pause
    exit /b 1
)
echo     OK
echo.

:: Build
echo [3/5] Erstelle Production Build...
call npm run build
if %errorlevel% neq 0 (
    echo [FEHLER] Build fehlgeschlagen
    pause
    exit /b 1
)
echo     OK
echo.

:: Lint
echo [4/5] Linting...
call npm run lint
if %errorlevel% neq 0 (
    echo [WARNUNG] Linting hat Fehler - trotzdem fortfahren? (J/N)
    choice /C JN /N
    if errorlevel 2 exit /b 1
)
echo     OK
echo.

:: Deploy
echo [5/5] Deploy zu Vercel...
echo.
echo Wähle Deploy-Methode:
echo   [1] Vercel (empfohlen)
echo   [2] Nur Build erstellen (manueller Upload)
echo.
choice /C 12 /N /M "Wahl: "

if errorlevel 2 goto buildonly
if errorlevel 1 goto vercel

:vercel
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo Vercel CLI wird installiert...
    call npm i -g vercel
)
echo.
echo Login bei Vercel (öffnet Browser)...
call vercel login
echo.
echo Deploy zu Production...
call vercel --prod
echo.
echo Domain zuweisen:
call vercel domains add unal.tombulca.de
goto end

:buildonly
echo.
echo Build erstellt im 'dist/' Ordner.
echo.
echo Nächste Schritte:
echo   1. Lade den 'dist/' Ordner auf deinen Server hoch
echo   2. Oder nutze: npx netlify deploy --prod --dir=dist
echo.
goto end

:end
echo.
echo ========================================
echo   DEPLOY ABGESCHLOSSEN
echo ========================================
echo.
echo Prüfe deine Website:
echo   https://unal.tombulca.de
echo.
pause
