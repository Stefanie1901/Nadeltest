// POST /api/submit
// Schreibt eine neue Bewertung in die Notion-Antworten-DB.
// Reicht Notion-Fehler ausführlich an den Client durch, damit Probleme sichtbar werden.

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_ANTWORTEN;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body || {};
    const {
      station,
      garn,
      nadel,
      datum,
      handgefuehl,
      maschenbild,
      match,
      ranking,
      bemerkungen,
      erfasserin,
    } = body;

    // Pflichtfelder prüfen
    const missing = [];
    if (!station) missing.push("Station");
    if (!garn) missing.push("Garn");
    if (!nadel) missing.push("Nadel");
    if (!handgefuehl) missing.push("Handgefühl");
    if (!maschenbild) missing.push("Maschenbild");
    if (!match) missing.push("Match");

    if (missing.length > 0) {
      return res.status(400).json({
        error: "Pflichtfelder fehlen",
        detail: "Bitte ausfüllen: " + missing.join(", "),
      });
    }

    const eintrag = `Station ${station} · ${nadel}`;

    const properties = {
      "Eintrag": { title: [{ text: { content: eintrag } }] },
      "Station": { number: parseInt(station, 10) },
      "Garn": { select: { name: String(garn) } },
      "Nadel": { select: { name: String(nadel) } },
      "Handgefuehl": { number: parseFloat(handgefuehl) },
      "Maschenbild": { number: parseFloat(maschenbild) },
      "Match": { number: parseFloat(match) },
    };

    if (datum) {
      properties["Stricktreff Datum"] = { date: { start: datum } };
    }
    if (ranking != null && ranking !== "") {
      properties["Reihenfolge an Station"] = { number: parseInt(ranking, 10) };
    }
    if (bemerkungen) {
      properties["Bemerkungen"] = { rich_text: [{ text: { content: String(bemerkungen) } }] };
    }
    if (erfasserin) {
      properties["Erfasserin"] = { rich_text: [{ text: { content: String(erfasserin) } }] };
    }

    const page = await notion.pages.create({
      parent: { database_id: DB_ID },
      properties,
    });

    res.status(200).json({ ok: true, id: page.id });
  } catch (err) {
    console.error("submit error:", err);

    // Notion-Fehler ausführlich durchreichen
    let detail = err.message || String(err);
    if (err.body) {
      try {
        const parsed = typeof err.body === "string" ? JSON.parse(err.body) : err.body;
        detail = parsed.message || JSON.stringify(parsed);
      } catch (_) {
        detail = String(err.body);
      }
    }

    res.status(500).json({
      error: "Speichern fehlgeschlagen",
      detail: detail,
      code: err.code || "unknown",
      status: err.status || 500,
    });
  }
}
