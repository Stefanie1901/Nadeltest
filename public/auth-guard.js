// auth-guard.js
// Einfach per <script src="/auth-guard.js"></script> einbinden.
// Zeigt beim ersten Aufruf ein Passwort-Overlay.
// Nach korrektem Passwort: sessionStorage merkt sich die Freigabe.
// Kein Passwort in ADMIN_PASSWORD gesetzt → kein Overlay.

(function () {
  const STORAGE_KEY = "nadeltest_admin_auth";

  // Schon authentifiziert in dieser Browser-Session?
  if (sessionStorage.getItem(STORAGE_KEY) === "yes") return;

  // Overlay sofort über die Seite legen
  var overlay = document.createElement("div");
  overlay.id = "auth-overlay";
  overlay.style.cssText = [
    "position:fixed", "top:0", "left:0", "width:100%", "height:100%",
    "background:#faf7f2", "z-index:9999",
    "display:flex", "flex-direction:column",
    "align-items:center", "justify-content:center",
    "padding:32px", "box-sizing:border-box",
    "font-family:-apple-system,BlinkMacSystemFont,sans-serif",
  ].join(";");

  overlay.innerHTML = [
    '<p style="font-size:11px;letter-spacing:0.18em;color:#b8a1c7;text-transform:uppercase;margin:0 0 10px;">Bad Mergentheim Knitting</p>',
    '<h1 style="font-family:Georgia,serif;font-size:26px;color:#8a6ea0;margin:0 0 4px;font-weight:400;">Nadeltest</h1>',
    '<div style="width:50px;height:1px;background:#d8c7e0;margin:14px 0;"></div>',
    '<p style="font-size:13px;color:#6b6070;margin:0 0 22px;">Bitte Passwort eingeben</p>',
    '<input id="_auth_pw" type="password" placeholder="Passwort"',
    '  autocomplete="current-password"',
    '  style="width:100%;max-width:280px;padding:14px 16px;',
    '  border:1.5px solid #d8c7e0;border-radius:12px;',
    '  font-size:16px;color:#3a3340;background:#fff;',
    '  margin-bottom:12px;box-sizing:border-box;outline:none;',
    '  -webkit-appearance:none;">',
    '<button id="_auth_btn"',
    '  style="width:100%;max-width:280px;padding:14px;',
    '  background:#8a6ea0;color:#fff;border:none;border-radius:12px;',
    '  font-size:15px;letter-spacing:0.04em;cursor:pointer;',
    '  -webkit-appearance:none;">',
    '  Weiter',
    '</button>',
    '<p id="_auth_err" style="color:#b44;font-size:13px;margin:12px 0 0;min-height:20px;"></p>',
    '<p style="font-family:Georgia,serif;font-size:12px;color:#d8c7e0;margin-top:36px;">&#9825;</p>',
  ].join("");

  document.body.appendChild(overlay);

  // Fokus nach kurzem Delay (iOS-kompatibler)
  setTimeout(function () {
    var inp = document.getElementById("_auth_pw");
    if (inp) inp.focus();
  }, 120);

  function tryAuth() {
    var pw  = document.getElementById("_auth_pw").value;
    var btn = document.getElementById("_auth_btn");
    var err = document.getElementById("_auth_err");

    btn.disabled = true;
    btn.textContent = "…";
    err.textContent = "";

    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          sessionStorage.setItem(STORAGE_KEY, "yes");
          overlay.style.transition = "opacity 0.25s";
          overlay.style.opacity = "0";
          setTimeout(function () { overlay.remove(); }, 280);
        } else {
          err.textContent = "Falsches Passwort";
          document.getElementById("_auth_pw").value = "";
          document.getElementById("_auth_pw").focus();
          btn.disabled = false;
          btn.textContent = "Weiter";
        }
      })
      .catch(function () {
        err.textContent = "Verbindungsfehler — bitte nochmal versuchen";
        btn.disabled = false;
        btn.textContent = "Weiter";
      });
  }

  document.getElementById("_auth_btn").addEventListener("click", tryAuth);
  document.getElementById("_auth_pw").addEventListener("keydown", function (e) {
    if (e.key === "Enter") tryAuth();
  });
})();
