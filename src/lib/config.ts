// Change DEFAULT_HUB_URL to your live License Hub (also editable on the login screen).
export const DEFAULT_HUB_URL = "https://retail-x-license-hub-phi.vercel.app";

// If the phone has not synced with the Hub for this many days, generating is locked until it syncs.
// (Option A keeps signing keys on the phone, so this limits how long a lost/revoked phone can keep issuing.)
export const OFFLINE_GRACE_DAYS = 14;

export const APP_VERSION = "2.0.0";

// Request timeout. Free hosting (Render) can take ~60 s to wake up.
export const HTTP_TIMEOUT_MS = 60000;

export const LOCK_AFTER_BACKGROUND_MS = 60000;
export const EXPIRY_WARN_DAYS = 7;
