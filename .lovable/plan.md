
# Logo vergroessern und Farben an Logo anpassen

## Was wird geaendert

### 1. Logo groesser machen (`src/components/Header.tsx`)
- Logo-Hoehe von `h-8 sm:h-10` auf `h-12 sm:h-14` erhoehen, damit es die Navigation ausfuellt
- Im Mobile-Menue das Logo ebenfalls groesser machen (`h-10`)
- Navigation-Padding leicht anpassen (`py-2`) damit das Logo gut sitzt

### 2. Farbschema an Logo anpassen (`src/index.css`)
Das Logo hat ein gruenes/lime Farbschema (gruener Baum + gelb-gruene Akzente). Die aktuelle Primaerfarbe ist Cyan-Blau und passt nicht zum Logo.

Aenderungen:
- **Primary**: Von Cyan-Blau (`195 100% 50%`) zu einem frischen Gruen (`145 80% 42%`) -- passend zum gruenen Baum im Logo
- **Primary Glow**: Entsprechend anpassen (`145 80% 55%`)
- **Gradient-Primary**: Gruen-Gradient statt Blau-Gradient
- **Shadow-Glow**: Gruener Glow-Effekt
- **Ring**: Gruene Ring-Farbe

Die Akzentfarbe (Gold/Gelb) bleibt bestehen, da sie gut zum Logo passt.

### 3. Hero-Text aktualisieren (`src/components/Hero.tsx`)
- "Taxi Service" Highlight-Text wird automatisch gruen statt blau durch die CSS-Aenderung
- Der "Eco-Friendly Transport" Badge passt farblich besser zum gruenen Thema

### Betroffene Dateien
- `src/components/Header.tsx` -- Logo-Groesse
- `src/index.css` -- Farbvariablen (primary, gradients, shadows)
