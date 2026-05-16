// POST /api/wish
// Speichert einen Wunsch in der Notion-Wünsche-DB.

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_WUENSCHE;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { wunsch, typ, von, datum, station } = req.body || {};

    if (!wunsch || !wunsch.trim()) {
      return res.status(400).json({ error: "Wunsch-Text fehlt" });
    }

    const properties = {
      "Wunsch": { title: [{ text: { content: String(wunsch).trim() } }] },
      "Status": { select: { name: "Neu" } },
    };

    if (typ && ["Garn", "Nadel", "Anderes"].includes(typ)) {
      properties["Typ"] = { select: { name: typ } };
    }
    if (von) {
      properties["Von"] = { rich_text: [{ text: { content: String(von).trim() } }] };
    }
    if (datum) {
      properties["Datum"] = { date: { start: datum } };
    }
    if (station) {
      const nr = parseInt(station, 10);
      if (!isNaN(nr)) properties["Station"] = { number: nr };
    }

    await notion.pages.create({
      parent: { database_id: DB_ID },
      properties,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("wish error:", err);
    let detail = err.message || String(err);
    if (err.body) {
      try {
        const b = typeof err.body === "string" ? JSON.parse(err.body) : err.body;
        detail = b.message || JSON.stringify(b);
      } catch (_) {}
    }
    res.status(500).json({ error: "Wunsch konnte nicht gespeichert werden", detail });
  }
}
