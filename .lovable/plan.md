

# Hero Redesign mit Video-Hintergrund

## Probleme im aktuellen Design
- Das Video ist nicht sichtbar (`.mov` Format hat schlechte Browser-Kompatibilitaet)
- Die "Modern Fleet" Karte auf der rechten Seite wirkt deplatziert und verdeckt das Video
- Das 2-Spalten-Layout lenkt vom cinematic Video-Hintergrund ab

## Aenderungen

### 1. Hero-Komponente komplett ueberarbeiten (`src/components/Hero.tsx`)

**Layout-Aenderung:**
- Das 2-Spalten Grid wird entfernt
- Die "Modern Fleet" Karte und die schwebenden Elemente werden entfernt
- Der gesamte Content wird zentriert (vertikal + horizontal)
- Groessere Typografie fuer einen cinematic Look

**Video-Fix:**
- `useRef` + `useEffect` fuer zuverlaessiges muted Autoplay (manueller `play()`-Aufruf als Fallback)
- Das Video bleibt `muted` (kein Sound) -- das ist auch zwingend noetig fuer Browser-Autoplay
- `preload="auto"` wird hinzugefuegt

**Neues Layout:**
```text
+----------------------------------------------+
|  <video> fullscreen background (muted, loop)  |
+----------------------------------------------+
|  Dunkler Gradient-Overlay (staerker)          |
+----------------------------------------------+
|                                               |
|        [Eco-Friendly Transport Badge]         |
|                                               |
|         Umweltfreundliche                     |
|           Taxi Service                        |
|                                               |
|     Schnell, zuverlaessig und...              |
|                                               |
|     [Jetzt Buchen]  [Mehr Erfahren]           |
|                                               |
|   24/7 Service  |  4.9 Rating  |  100% Eco   |
+----------------------------------------------+
```

### 2. Gradient-Overlay verstaerken (`src/index.css`)
- `--gradient-hero` wird zu einem mehrstufigen Overlay mit staerkerem Dunkeleffekt von unten
- Das sorgt fuer bessere Lesbarkeit des weissen Textes ueber dem Video

### Technische Details
- Das `muted`-Attribut ist bereits vorhanden und bleibt bestehen -- es wird zusaetzlich per `videoRef.muted = true` im Code gesetzt
- `playsInline` bleibt fuer iOS-Kompatibilitaet
- `useEffect` ruft `video.play()` manuell auf, falls der Browser Autoplay blockiert
- Das `.mov`-Format bleibt als einzige Quelle (da es die vorhandene Datei ist), aber der manuelle Play-Aufruf verbessert die Zuverlaessigkeit

