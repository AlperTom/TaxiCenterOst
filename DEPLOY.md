# 🚀 Deployment Guide - unal.tombulca.de

## Ziel
- **Domain:** unal.tombulca.de
- **Hosting:** Static Site (Vite Build)
- **Backend:** Supabase (vvwtkkatgegcezfubhxx)

---

## Schnellstart: Vercel (Empfohlen)

### 1. Vercel CLI installieren
```bash
npm i -g vercel
```

### 2. Deploy
```bash
vercel login
vercel --prod
vercel domains add unal.tombulca.de
```

### 3. Environment Variables in Vercel
**WICHTIG:** Setze diese im Vercel Dashboard, nicht in Dateien!

1. https://vercel.com/dashboard → Projekt → Settings → Environment Variables
2. Füge hinzu:
   - `VITE_SUPABASE_URL` = `https://vvwtkkatgegcezfubhxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `[Dein Anon Key aus Supabase]`
   - `VITE_DEFAULT_TENANT` = `ostbahnhof`

---

## Alternative: Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

---

## WICHTIG: Keine Secrets committen!

⚠️ **NIE Keys in .env.production oder Git committen!**

Keys immer nur im Hosting-Dashboard setzen:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

---

## Post-Deploy Tests

1. **Website erreichbar?**
   ```bash
   curl -I https://unal.tombulca.de
   ```

2. **Supabase verbunden?**
   - Öffne https://unal.tombulca.de/admin
   - Buchungen sollten laden

3. **Telegram funktioniert?**
   - Erstelle Test-Buchung
   - "An Telegram senden"
   - Prüfe Telegram-Gruppe
