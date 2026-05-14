// GET /api/results
// Liefert alle Antworten plus die Stammdaten von Nadeln und Garnen
// (damit das Dashboard nach Material, Faserart etc. aggregieren kann).
// Optional passwortgeschützt via ADMIN_PASSWORD (Header X-Admin-Password).

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ANTWORTEN = process.env.NOTION_DB_ANTWORTEN;
const DB_NADELN = process.env.NOTION_DB_NADELN;
const DB_GARNE = process.env.NOTION_DB_GARNE;

function getText(prop) {
  if (!prop) return "";
  if (prop.type === "title") return (prop.title?.[0]?.plain_text || "").trim();
  if (prop.type === "rich_text") return (prop.rich_text || []).map((r) => r.plain_text).join("").trim();
  return "";
}

function getSelect(prop) { return prop?.select?.name || ""; }
function getMultiSelect(prop) { return (prop?.multi_select || []).map((s) => s.name); }
function getNumber(prop) { return prop?.number ?? null; }
function getDate(prop) { return prop?.date?.start || null; }
function getCreatedTime(prop) { return prop?.created_time || null; }

async function queryAll(databaseId, options = {}) {
  const items = [];
  let cursor;
  do {
    const r = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: cursor,
      ...options,
    });
    items.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return items;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const adminPw = process.env.ADMIN_PASSWORD;
  if (adminPw) {
    const provided = req.headers["x-admin-password"] || (req.query?.pw || "");
    if (provided !== adminPw) {
      return res.status(401).json({ error: "Nicht autorisiert" });
    }
  }

  try {
    const [antwortenPages, nadelnPages, garnePages] = await Promise.all([
      queryAll(DB_ANTWORTEN, { sorts: [{ timestamp: "created_time", direction: "descending" }] }),
      queryAll(DB_NADELN),
      queryAll(DB_GARNE),
    ]);

    const antworten = antwortenPages.map((p) => ({
      id: p.id,
      eintrag: getText(p.properties["Eintrag"]),
      stricktreffDatum: getDate(p.properties["Stricktreff Datum"]),
      station: getNumber(p.properties["Station"]),
      garn: getSelect(p.properties["Garn"]),
      nadel: getSelect(p.properties["Nadel"]),
      reihenfolge: getNumber(p.properties["Reihenfolge an Station"]),
      handgefuehl: getNumber(p.properties["Handgefuehl"]),
      maschenbild: getNumber(p.properties["Maschenbild"]),
      match: getNumber(p.properties["Match"]),
      bemerkungen: getText(p.properties["Bemerkungen"]),
      erfasserin: getText(p.properties["Erfasserin"]),
      eingereicht: getCreatedTime(p.properties["Eingereicht"]),
    }));

    const nadeln = nadelnPages
      .map((p) => ({
        name: getText(p.properties["Name"]),
        hersteller: getSelect(p.properties["Hersteller"]),
        material: getSelect(p.properties["Material"]),
        staerke: getNumber(p.properties["Staerke mm"]),
        typ: getSelect(p.properties["Typ"]),
      }))
      .filter((n) => n.name);

    const garne = garnePages
      .map((p) => ({
        name: getText(p.properties["Name"]),
        hersteller: getSelect(p.properties["Hersteller"]),
        faserart: getMultiSelect(p.properties["Faserart"]),
        laufleistung: getNumber(p.properties["Laufleistung m_100g"]),
      }))
      .filter((g) => g.name);

    res.status(200).json({
      count: antworten.length,
      antworten,
      nadeln,
      garne,
    });
  } catch (err) {
    console.error("results error:", err);
    res.status(500).json({ error: "Konnte Antworten nicht laden", detail: String(err?.message || err) });
  }
}
