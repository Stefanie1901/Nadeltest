# 🪡 Nadeltest · Bad Mergentheim Knitting

Anonymer Fragebogen für den Stricktreff-Nadeltest. Notion als Backend, Vercel als Hosting.

## Was die App kann

- **Teilnehmerinnen-Sicht** (`/`): QR-Code scannen → Station und Garn sind vorausgefüllt → Nadel wählen → 3 Bewertungen + Freitext + **optional ihr Name**. Bleibt der Name leer, ist die Antwort anonym.
- **Admin-Hub** (`/admin`): Schaltzentrale mit Links zu allen Admin-Funktionen + **Schnell-QR-Generator** für spontane Stationen während des Stricktreffs (Live-QR, „In WhatsApp teilen", „Link kopieren", „QR drucken").
- **Setup-Sicht** (`/setup`): Vor dem Stricktreff alle Stationen anlegen, Garne zuordnen, QR-Bogen drucken.
- **Auswertung** (`/dashboard`): Umfangreiche graphische Auswertungen mit Filtern, Top-Pairings, Material-/Faserart-Aggregation, Konsens-Check, Pearson-Korrelation, Erfasserinnen-Stats, Heatmap, Reihenfolge-Effekt — optional passwortgeschützt.
- **PDF-Bericht** (`/report`): Druckoptimierter Bericht im Bad-Mergentheim-Knitting-Design. Aus dem Dashboard mit aktuellen Filtern aufrufbar oder per `?treff=YYYY-MM-DD` direkt. Browser-Print speichert als PDF.
- **CSV-Export**: Aus dem Dashboard heraus mit einem Klick.

## Architektur

- **Frontend**: Vanilla HTML/CSS/JS, kein Build-Step
- **Backend**: Drei Vercel Serverless Functions (`/api/options`, `/api/submit`, `/api/results`)
- **Daten**: Drei Notion-Datenbanken (Nadeln, Garne, Antworten) — bereits angelegt
- **Charts**: Chart.js via CDN

## Setup-Schritte (einmalig)

### 1 · Notion-Integration anlegen

1. Gehe zu https://www.notion.so/profile/integrations
2. „Neue Integration" → Name z. B. „Nadeltest", Workspace wählen → speichern
3. Den **„Internal Integration Secret"** kopieren (beginnt mit `secret_…`). Das ist das `NOTION_TOKEN`.
4. In jeder der drei Datenbanken (🪡 Nadeln, 🧶 Garne, 📊 Nadeltest-Antworten) das `•••`-Menü öffnen → „Verbindungen" → die Integration einladen.

### 2 · GitHub-Repo erstellen

1. https://github.com → neues Repo, z. B. `nadeltest`, privat oder öffentlich, **leer** (kein README anhaken).
2. Den Inhalt dieses Projekts via GitHub Web-Editor anlegen (siehe „Dateien anlegen" unten).

### 3 · Vercel verbinden

1. https://vercel.com → „Add New… → Project" → GitHub-Repo wählen.
2. Framework Preset: **Other** (lassen wie es ist; keine Build-Command nötig).
3. **Root Directory**: Standard lassen (Repo-Wurzel).
4. „Environment Variables" eintragen:
   - `NOTION_TOKEN` = dein `secret_…`-Token
   - `NOTION_DB_NADELN` = `7a6d3469-8373-42e8-a40e-2363bc36f287`
   - `NOTION_DB_GARNE` = `74ce5531-470b-4f1e-818a-de7c7013b32b`
   - `NOTION_DB_ANTWORTEN` = `20786819-184f-41d8-8bc1-ca621f119e46`
   - `ADMIN_PASSWORD` = ein Passwort deiner Wahl (oder leer lassen für offenes Dashboard)
5. Deploy klicken.
6. Nach erfolgreichem Deploy URL aufrufen, `/setup` testen.

⚠️ **Wichtig (Lessons Learned)**: Nach jeder Änderung an Environment Variables muss in Vercel manuell ein Redeploy gestartet werden, sonst greifen sie nicht.

## Dateien anlegen (GitHub Web-Editor, Tablet-tauglich)

Für jede Datei im Repo: „Add file" → „Create new file" → den vollen Pfad inkl. Ordner eintragen (z. B. `api/submit.js` — der Schrägstrich legt den Ordner automatisch an). Inhalt einfügen → Commit.

Dateien in der Reihenfolge anlegen:

```
package.json
vercel.json
.gitignore
.env.example
README.md
api/options.js
api/submit.js
api/results.js
public/styles.css
public/analytics.js
public/index.html
public/setup.html
public/admin.html
public/dashboard.html
public/report.html
```

## Workflow vor jedem Stricktreff

1. **Garne und Nadeln in Notion** pflegen, „Aktiv" anhaken bei dem, was am Tisch liegt.
2. **`/setup`** öffnen → Datum, Stationen + Garne eintragen → QR-Codes generieren → drucken.
3. **QR-Codes** an die Körbe legen, dazu ein Schild mit den Nadel-Namen pro Korb (jede Nadel mit dem exakten Notion-Namen beschildern, damit sie im Dropdown wiedergefunden wird).
4. Während des Treffs läuft alles automatisch.
5. Nach dem Treff: Fotos der Musterstücke direkt in Notion in der Antworten-DB ergänzen (Foto-Property).

## Auswertung

- **`/dashboard`** — Live-Auswertung
- **Notion** — `📅 Pro Stricktreff`, `🖼️ Galerie mit Fotos`, `📈 Dashboard` direkt in der Antworten-DB

## Datenbank-IDs (Referenz)

- 🪡 Nadeln: `7a6d3469-8373-42e8-a40e-2363bc36f287`
- 🧶 Garne: `74ce5531-470b-4f1e-818a-de7c7013b32b`
- 📊 Antworten: `20786819-184f-41d8-8bc1-ca621f119e46`
- Hub-Seite: https://www.notion.so/36067af5325081b78a18fcde7c73d44b
