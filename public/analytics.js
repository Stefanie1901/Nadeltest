// Analytics-Helpers für Dashboard und Report.
// Eingaben: rohe Antworten + Stammdaten (nadeln, garne) aus /api/results.

(function (global) {
  "use strict";

  const Analytics = {};

  // ---------- Basis ----------

  function avg(arr) {
    const v = arr.filter((x) => Number.isFinite(x));
    if (v.length === 0) return null;
    return v.reduce((a, b) => a + b, 0) / v.length;
  }

  function stddev(arr) {
    const v = arr.filter((x) => Number.isFinite(x));
    if (v.length < 2) return null;
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const variance = v.reduce((a, b) => a + (b - m) * (b - m), 0) / (v.length - 1);
    return Math.sqrt(variance);
  }

  function gesamtschnitt(r) {
    return avg([r.handgefuehl, r.maschenbild, r.match]);
  }

  function groupBy(arr, keyFn) {
    return arr.reduce((acc, item) => {
      const k = (typeof keyFn === "function" ? keyFn(item) : item[keyFn]) || "—";
      (acc[k] = acc[k] || []).push(item);
      return acc;
    }, {});
  }

  function uniqueSorted(arr, key, locale) {
    return Array.from(new Set(arr.map((x) => x[key]).filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b), locale || "de"));
  }

  // ---------- Stammdaten-Joins ----------

  function buildLookup(items, key) {
    const map = new Map();
    items.forEach((i) => {
      if (i[key]) map.set(i[key], i);
    });
    return map;
  }

  function enrichRecords(antworten, nadeln, garne) {
    const nMap = buildLookup(nadeln || [], "name");
    const gMap = buildLookup(garne || [], "name");
    return antworten.map((r) => {
      const n = nMap.get(r.nadel);
      const g = gMap.get(r.garn);
      return {
        ...r,
        nadelHersteller: n?.hersteller || "",
        nadelMaterial: n?.material || "",
        nadelStaerke: n?.staerke ?? null,
        nadelTyp: n?.typ || "",
        garnHersteller: g?.hersteller || "",
        garnFaserart: g?.faserart || [],
        gesamt: gesamtschnitt(r),
      };
    });
  }

  // ---------- Aggregationen ----------

  function statsFor(items) {
    return {
      n: items.length,
      handgefuehl: avg(items.map((r) => r.handgefuehl)),
      maschenbild: avg(items.map((r) => r.maschenbild)),
      match: avg(items.map((r) => r.match)),
      gesamt: avg(items.map((r) => gesamtschnitt(r))),
      streuung: stddev(items.map((r) => gesamtschnitt(r))),
    };
  }

  function aggregateBy(records, key) {
    const grouped = groupBy(records, key);
    return Object.entries(grouped)
      .map(([k, items]) => ({ key: k, ...statsFor(items) }))
      .sort((a, b) => (b.gesamt ?? 0) - (a.gesamt ?? 0));
  }

  function aggregateByMulti(records, listKey) {
    // listKey ist ein Feld, das eine Liste enthält (z.B. garnFaserart).
    // Ein Datensatz kann zu mehreren Gruppen gehören.
    const grouped = {};
    records.forEach((r) => {
      const list = r[listKey] || [];
      list.forEach((v) => {
        (grouped[v] = grouped[v] || []).push(r);
      });
    });
    return Object.entries(grouped)
      .map(([k, items]) => ({ key: k, ...statsFor(items) }))
      .sort((a, b) => (b.gesamt ?? 0) - (a.gesamt ?? 0));
  }

  // ---------- Pairings ----------

  function pairings(records, minN) {
    const min = minN || 1;
    const grouped = groupBy(records, (r) => (r.garn || "—") + "|||" + (r.nadel || "—"));
    return Object.entries(grouped)
      .map(([k, items]) => {
        const [garn, nadel] = k.split("|||");
        return { garn, nadel, ...statsFor(items) };
      })
      .filter((p) => p.n >= min && p.gesamt != null)
      .sort((a, b) => b.gesamt - a.gesamt);
  }

  // ---------- Konsens / Streuung ----------

  function dispersion(records, key) {
    return aggregateBy(records, key)
      .filter((g) => g.n >= 2 && g.streuung != null)
      .sort((a, b) => b.streuung - a.streuung);
  }

  // ---------- Pearson-Korrelation ----------

  function pearson(xs, ys) {
    const pairs = xs.map((x, i) => [x, ys[i]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
    if (pairs.length < 3) return null;
    const n = pairs.length;
    const sumX = pairs.reduce((a, [x]) => a + x, 0);
    const sumY = pairs.reduce((a, [, y]) => a + y, 0);
    const mX = sumX / n;
    const mY = sumY / n;
    let num = 0, dX = 0, dY = 0;
    pairs.forEach(([x, y]) => {
      num += (x - mX) * (y - mY);
      dX += (x - mX) ** 2;
      dY += (y - mY) ** 2;
    });
    if (dX === 0 || dY === 0) return null;
    return num / Math.sqrt(dX * dY);
  }

  // ---------- Erfasserinnen ----------

  function erfasserinnenStats(records) {
    const namedOnly = records.filter((r) => r.erfasserin && r.erfasserin.trim());
    const grouped = groupBy(namedOnly, "erfasserin");
    return Object.entries(grouped)
      .map(([name, items]) => ({
        name,
        n: items.length,
        gesamt: avg(items.map(gesamtschnitt)),
        haerte: avg(items.map(gesamtschnitt)), // identisch zu gesamt; Interpretation: niedrig=strenge Bewerterin
        handgefuehl: avg(items.map((r) => r.handgefuehl)),
        maschenbild: avg(items.map((r) => r.maschenbild)),
        match: avg(items.map((r) => r.match)),
      }))
      .sort((a, b) => b.n - a.n);
  }

  // ---------- Aggregierte Übersichts-KPIs ----------

  function summary(records) {
    const valid = records.filter((r) => Number.isFinite(gesamtschnitt(r)));
    return {
      total: records.length,
      treffe: uniqueSorted(records, "stricktreffDatum").length,
      nadeln: uniqueSorted(records, "nadel").length,
      garne: uniqueSorted(records, "garn").length,
      erfasserinnen: uniqueSorted(records.filter((r) => r.erfasserin), "erfasserin").length,
      gesamtschnitt: avg(valid.map(gesamtschnitt)),
      handgefuehl: avg(records.map((r) => r.handgefuehl)),
      maschenbild: avg(records.map((r) => r.maschenbild)),
      match: avg(records.map((r) => r.match)),
    };
  }

  // ---------- Hilfsfunktionen ----------

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatDate(iso, opts) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("de-DE", opts || { day: "2-digit", month: "long", year: "numeric" });
  }

  function num(v, digits) {
    if (v == null || !Number.isFinite(v)) return "—";
    return v.toFixed(digits ?? 2);
  }

  // ---------- Export ----------

  Analytics.avg = avg;
  Analytics.stddev = stddev;
  Analytics.gesamtschnitt = gesamtschnitt;
  Analytics.groupBy = groupBy;
  Analytics.uniqueSorted = uniqueSorted;
  Analytics.enrichRecords = enrichRecords;
  Analytics.statsFor = statsFor;
  Analytics.aggregateBy = aggregateBy;
  Analytics.aggregateByMulti = aggregateByMulti;
  Analytics.pairings = pairings;
  Analytics.dispersion = dispersion;
  Analytics.pearson = pearson;
  Analytics.erfasserinnenStats = erfasserinnenStats;
  Analytics.summary = summary;
  Analytics.escapeHtml = escapeHtml;
  Analytics.formatDate = formatDate;
  Analytics.num = num;

  global.Analytics = Analytics;
})(window);
