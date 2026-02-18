

# Video von .mov zu .mp4 konvertieren und Code anpassen

## Problem
Das Hero-Video ist im `.mov`-Format (QuickTime). Dieses Format wird nur von Safari unterstuetzt. Chrome, Firefox und Edge koennen `.mov` nicht abspielen, weshalb das Video nicht sichtbar ist.

## Loesung

### Schritt 1: Video konvertieren (durch den Nutzer)
- Die Datei `public/videos/hero-background.mov` muss zu `.mp4` (H.264 Codec) konvertiert werden
- Tools: [cloudconvert.com](https://cloudconvert.com/mov-to-mp4), HandBrake, oder FFmpeg
- Die konvertierte Datei als `hero-background.mp4` hier hochladen

### Schritt 2: Code anpassen (`src/components/Hero.tsx`)
Nach dem Upload der `.mp4`-Datei:
- Die `<source>`-Zeile aendern von:
  ```html
  <source src="/videos/hero-background.mov" type="video/quicktime" />
  ```
  zu:
  ```html
  <source src="/videos/hero-background.mp4" type="video/mp4" />
  ```
- Optional: Beide Formate als Fallback anbieten (mp4 zuerst, mov als Backup fuer Safari)

### Warum .mp4?
- `.mp4` mit H.264 wird von **allen** modernen Browsern unterstuetzt (Chrome, Firefox, Safari, Edge)
- `.mov` ist ein Apple-Format und funktioniert nur in Safari

### Naechster Schritt
Bitte lade die konvertierte `.mp4`-Datei hoch, dann passe ich den Code sofort an.

