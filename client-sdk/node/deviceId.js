// Device ID for Electron / Node desktop apps on Windows (CommonJS).
const crypto = require("crypto");
const os = require("os");
const { execSync } = require("child_process");

function machineGuid() {
  try {
    const out = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { encoding: "utf8", windowsHide: true }
    );
    return (out.match(/MachineGuid\s+REG_SZ\s+(\S+)/i) || [])[1] || "";
  } catch { return ""; }
}

function getDeviceId() {
  const parts = [
    "win",
    machineGuid(),
    (os.cpus()[0] || {}).model || "",
    os.arch(),
  ];
  const hex = crypto.createHash("sha256").update("GLN-DEVID-v1|" + parts.join("|")).digest("hex").toUpperCase();
  return hex.slice(0, 20).match(/.{4}/g).join("-"); // XXXX-XXXX-XXXX-XXXX-XXXX
}

module.exports = { getDeviceId };
