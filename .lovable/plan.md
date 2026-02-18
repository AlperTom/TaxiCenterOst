
# Video-Hintergrund im Hero-Banner

## Was wird gemacht
Das hochgeladene Video (`.mov`) wird als fullscreen Hintergrund-Video in die Hero-Sektion eingebaut. Es ersetzt das aktuelle statische Hintergrundbild und laeuft als endlose Schleife (loop) ab.

## Umsetzung

### 1. Video in das Projekt kopieren
- Die Datei `gemini_generated_video_D36E6E81.mov` wird nach `public/videos/hero-background.mov` kopiert
- `public/` wird verwendet, da Video-Dateien zu gross fuer Vite-Bundling ueber `src/assets` sind

### 2. Hero-Komponente anpassen (`src/components/Hero.tsx`)
- Das bisherige `backgroundImage`-Style wird entfernt
- Ein `<video>`-Element wird als absolut positionierter Hintergrund eingefuegt mit:
  - `autoPlay`, `loop`, `muted`, `playsInline` (fuer Mobile-Autoplay)
  - `object-cover` und `absolute inset-0` fuer Fullscreen-Abdeckung
  - Das statische Bild bleibt als `poster`-Fallback erhalten
- Der dunkle Gradient-Overlay bleibt bestehen, damit der Text lesbar bleibt

### Technische Details

```text
Aufbau der Hero-Sektion:
+----------------------------------+
|  <video> (absolute, z-0)         |
|    autoPlay, loop, muted         |
|    object-fit: cover             |
+----------------------------------+
|  Gradient Overlay (absolute, z-1)|
+----------------------------------+
|  Content (relative, z-10)        |
|    - Headline, Buttons, Stats    |
+----------------------------------+
```

- Der `import heroBackground` bleibt als Poster/Fallback fuer langsame Verbindungen
- Video-Attribute `muted` und `playsInline` sind zwingend noetig, damit Autoplay auf mobilen Geraeten funktioniert
