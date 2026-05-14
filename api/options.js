// GET /api/options
// Liefert die Liste der aktiven Nadeln und Garne aus den Notion-Stammdaten-DBs.
// Wird vom Formular beim Laden aufgerufen, damit die Dropdowns frisch sind.

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const DB_NADELN = process.env.NOTION_DB_NADELN;
const DB_GARNE = process.env.NOTION_DB_GARNE;

function getText(prop) {
  if (!prop) return "";
  if (prop.type === "title") return (prop.title?.[0]?.plain_text || "").trim();
  if (prop.type === "rich_text") return (prop.rich_text?.[0]?.plain_text || "").trim();
  return "";
}

function getSelect(prop) {
  return prop?.select?.name || "";
}

function getMultiSelect(prop) {
  return (prop?.multi_select || []).map((s) => s.name);
}

function getNumber(prop) {
  return prop?.number ?? null;
}

async function queryAll(dataSourceId) {
  const results = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({
      database_id: dataSourceId,
      filter: {
        property: "Aktiv",
        checkbox: { equals: true },
      },
      page_size: 100,
      start_cursor: cursor,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const [nadelnPages, garnePages] = await Promise.all([
      queryAll(DB_NADELN),
      queryAll(DB_GARNE),
    ]);

    const nadeln = nadelnPages
      .map((p) => ({
        id: p.id,
        name: getText(p.properties["Name"]),
        hersteller: getSelect(p.properties["Hersteller"]),
        material: getSelect(p.properties["Material"]),
        staerke: getNumber(p.properties["Staerke mm"]),
        typ: getSelect(p.properties["Typ"]),
        notizen: getText(p.properties["Notizen"]),
      }))
      .filter((n) => n.name)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    const garne = garnePages
      .map((p) => ({
        id: p.id,
        name: getText(p.properties["Name"]),
        hersteller: getSelect(p.properties["Hersteller"]),
        faserart: getMultiSelect(p.properties["Faserart"]),
        laufleistung: getNumber(p.properties["Laufleistung m_100g"]),
        empfohleneNadelstaerke: getText(p.properties["Empfohlene Nadelstaerke"]),
        notizen: getText(p.properties["Notizen"]),
      }))
      .filter((g) => g.name)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    res.status(200).json({ nadeln, garne });
  } catch (err) {
    console.error("options error:", err);
    res.status(500).json({ error: "Konnte Optionen nicht laden", detail: String(err?.message || err) });
  }
}
