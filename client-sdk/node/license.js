// License check for Electron / Node apps. Needs: npm i tweetnacl tweetnacl-util
const fs = require("fs");
const path = require("path");
const nacl = require("tweetnacl");
const { decodeBase64 } = require("tweetnacl-util");
const { getDeviceId } = require("./deviceId");

// ====== CHANGE THESE TWO PER APP ======
const APP_CODE = "myapp";
const PUBLIC_KEY = "PASTE_PUBLIC_KEY_FROM_GENERATOR_KEYS_TAB";
// ======================================

const b64u = (s) => decodeBase64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
const normalize = (s) => {
  const r = s.toUpperCase().replace(/[^0-9A-F]/g, "");
  return r.length === 20 ? r.match(/.{4}/g).join("-") : null;
};

// dataDir: e.g. app.getPath("userData") in Electron
function makeLicense(dataDir) {
  const fLic = path.join(dataDir, "license.key");
  const fSeen = path.join(dataDir, "license.seen");
  const now = () => Math.floor(Date.now() / 1000);

  function verify(license) {
    try {
      const p = license.trim().split(".");
      if (p.length !== 3 || p[0] !== "GLN1") return { ok: false, reason: "format" };
      const body = b64u(p[1]);
      if (!nacl.sign.detached.verify(body, b64u(p[2]), b64u(PUBLIC_KEY))) return { ok: false, reason: "signature" };
      const d = JSON.parse(Buffer.from(body).toString("utf8"));
      if (d.app !== APP_CODE) return { ok: false, reason: "app" };
      if (d.did !== normalize(getDeviceId())) return { ok: false, reason: "device" };
      const last = fs.existsSync(fSeen) ? parseInt(fs.readFileSync(fSeen, "utf8"), 10) : 0;
      if (last && now() + 300 < last) return { ok: false, reason: "clock" };
      if (d.exp !== 0 && now() >= d.exp) return { ok: false, reason: "expired" };
      fs.writeFileSync(fSeen, String(Math.max(now(), last || 0)));
      return { ok: true, payload: d, daysLeft: d.exp === 0 ? null : Math.ceil((d.exp - now()) / 86400) };
    } catch { return { ok: false, reason: "format" }; }
  }

  return {
    deviceId: getDeviceId,
    activate(license) {
      const r = verify(license);
      if (r.ok) fs.writeFileSync(fLic, license.trim());
      return r;
    },
    checkSaved() {
      return fs.existsSync(fLic) ? verify(fs.readFileSync(fLic, "utf8")) : { ok: false, reason: "format" };
    },
  };
}

module.exports = { makeLicense };
