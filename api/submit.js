// POST /api/submit
// Speichert eine neue Bewertung in der Antworten-DB.

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ANTWORTEN = process.env.NOTION_DB_ANTWORTEN;

function clampRating(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function clampPositiveInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.round(n));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Nur POST" });
  }

  try {
    const body = req.body || {};

    const station = clampPositiveInt(body.station);
    const reihenfolge = clampPositiveInt(body.reihenfolge);
    const handgefuehl = clampRating(body.handgefuehl);
    const maschenbild = clampRating(body.maschenbild);
    const match = clampRating(body.match);
    const garn = (body.garn || "").toString().trim().slice(0, 100);
    const nadel = (body.nadel || "").toString().trim().slice(0, 100);
    const bemerkungen = (body.bemerkungen || "").toString().trim().slice(0, 2000);
    const erfasserin = (body.erfasserin || "").toString().trim().slice(0, 100);
    const stricktreffDatum = (body.stricktreffDatum || "").toString().trim();

    // Pflichtfelder
    if (!station || !garn || !nadel || !handgefuehl || !maschenbild || !match) {
      return res.status(400).json({
        error: "Bitte alle Pflichtfelder ausfüllen",
        missing: { station: !station, garn: !garn, nadel: !nadel, handgefuehl: !handgefuehl, maschenbild: !maschenbild, match: !match },
      });
    }

    // Title-Feld zusammenbauen
    const datum = stricktreffDatum || new Date().toISOString().slice(0, 10);
    const eintragTitle = `Station ${station} · ${nadel} · ${garn} · ${datum}`;

    const properties = {
      "Eintrag": {
        title: [{ text: { content: eintragTitle.slice(0, 200) } }],
      },
      "Station": { number: station },
      "Garn": { select: { name: garn } },
      "Nadel": { select: { name: nadel } },
      "Handgefuehl": { number: handgefuehl },
      "Maschenbild": { number: maschenbild },
      "Match": { number: match },
    };

    if (reihenfolge) properties["Reihenfolge an Station"] = { number: reihenfolge };
    if (bemerkungen) {
      properties["Bemerkungen"] = {
        rich_text: [{ text: { content: bemerkungen } }],
      };
    }
    if (erfasserin) {
      properties["Erfasserin"] = {
        rich_text: [{ text: { content: erfasserin } }],
      };
    }
    if (stricktreffDatum) {
      properties["Stricktreff Datum"] = {
        date: { start: stricktreffDatum },
      };
    }

    const created = await notion.pages.create({
      parent: { database_id: DB_ANTWORTEN },
      properties,
    });

    res.status(200).json({ ok: true, id: created.id });
  } catch (err) {
    console.error("submit error:", err);
    res.status(500).json({ error: "Speichern fehlgeschlagen", detail: String(err?.message || err) });
  }
}
