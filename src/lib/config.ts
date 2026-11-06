// Change DEFAULT_HUB_URL to your live License Hub (also editable on the login screen).
export const DEFAULT_HUB_URL = "https://retail-x-license-hub-phi.vercel.app";

export const APP_VERSION = "3.0.0";

// Default country calling code used when a client phone starts with 0 (e.g. 0300... -> +92300...).
export const DEFAULT_COUNTRY_CODE = "92";
export const COMPANY_CREDIT = "RetailX Solution · 03286575000";

// Request timeout. Free hosting (Render) can take ~60 s to wake up.
export const HTTP_TIMEOUT_MS = 60000;

export const LOCK_AFTER_BACKGROUND_MS = 60000;
export const STALE_SYNC_DAYS = 30; // only a gentle hint on Home, never blocks anything
export const EXPIRY_WARN_DAYS = 7;
