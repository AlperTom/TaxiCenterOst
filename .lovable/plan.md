

# Hero-Video als MP4 einbinden

## Schritte

### 1. Video kopieren
- `user-uploads://gemini_generated_video_D36E6E81.mp4` nach `public/videos/hero-background.mp4` kopieren

### 2. Code anpassen (`src/components/Hero.tsx`)
- Source-Tag von `.mov`/`quicktime` auf `.mp4`/`video/mp4` aendern
- Beide Formate als Fallback anbieten (mp4 zuerst, mov als Backup)

