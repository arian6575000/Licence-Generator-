// License check for Electron / Node apps (CommonJS). Needs: npm i tweetnacl
// Format: MPOS-LIC-<base64url payload>.<base64url ed25519 signature>   (same as RetailX License Hub)
const fs = require("fs");
const path = require("path");
const nacl = require("tweetnacl");
const { getDeviceId } = require("./deviceId");

// ====== CHANGE THESE PER APP ======
const PROJECT_CODE = "myapp";                               // only checked if the license carries project_code
const PUBLIC_KEY_HEX = "PASTE_PUBLIC_KEY_HEX_FROM_GENERATOR_KEYS_TAB";
// Use your own machine id if you have one (RetailX hardware id); default = generated device id.
const MACHINE_ID = () => getDeviceId();
// ==================================

const PREFIX = "MPOS-LIC-";
const hex = (h) => Uint8Array.from(h.match(/../g).map((x) => parseInt(x, 16)));
const unb64u = (s) => new Uint8Array(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"));

function makeLicense(dataDir) {
  const fLic = path.join(dataDir, "license.key");
  const fSeen = path.join(dataDir, "license.seen");

  function verify(license) {
    try {
      const key = license.trim();
      if (!key.startsWith(PREFIX)) return { ok: false, reason: "format" };
      const p = key.slice(PREFIX.length).split(".");
      if (p.length !== 2) return { ok: false, reason: "format" };
      const body = unb64u(p[0]);
      if (!nacl.sign.detached.verify(body, unb64u(p[1]), hex(PUBLIC_KEY_HEX))) return { ok: false, reason: "signature" };
      const d = JSON.parse(Buffer.from(body).toString("utf8"));
      if (d.project_code && d.project_code !== PROJECT_CODE) return { ok: false, reason: "project" };
      if (String(d.machine_id).trim().toUpperCase() !== String(MACHINE_ID()).trim().toUpperCase()) return { ok: false, reason: "machine" };
      const now = Date.now();
      const last = fs.existsSync(fSeen) ? parseInt(fs.readFileSync(fSeen, "utf8"), 10) : 0;
      if (last && now + 300000 < last) return { ok: false, reason: "clock" };
      let daysLeft = null;
      if (!d.is_lifetime) {
        const end = Date.parse(d.expiry_date.slice(0, 10) + "T23:59:59Z");
        if (now > end) return { ok: false, reason: "expired" };
        daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
      }
      fs.writeFileSync(fSeen, String(Math.max(now, last || 0)));
      return { ok: true, payload: d, daysLeft, can: (f) => d.features && d.features[f] === true };
    } catch { return { ok: false, reason: "format" }; }
  }

  return {
    deviceId: () => MACHINE_ID(),
    activate(license) { const r = verify(license); if (r.ok) fs.writeFileSync(fLic, license.trim()); return r; },
    checkSaved() { return fs.existsSync(fLic) ? verify(fs.readFileSync(fLic, "utf8")) : { ok: false, reason: "format" }; },
  };
}

module.exports = { makeLicense };
