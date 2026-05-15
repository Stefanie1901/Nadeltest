// GET /api/qr?text=...
// Generiert einen QR-Code als PNG und liefert ihn als Bild aus.
// So braucht der Browser keine externe QR-Library mehr.

import QRCode from "qrcode";

export default async function handler(req, res) {
  const text = (req.query.text || "").toString();
  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 280, 100), 600);

  if (!text) {
    res.status(400).send("Missing text parameter");
    return;
  }

  try {
    const buffer = await QRCode.toBuffer(text, {
      type: "png",
      width: size,
      margin: 1,
      color: { dark: "#3a3340", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.status(200).send(buffer);
  } catch (e) {
    console.error("qr error:", e);
    res.status(500).send("QR generation failed: " + (e.message || e));
  }
}
