import { CATALOG_DATA } from "./catalogData";

export type FeatureMap = Record<string, boolean | string | number>;

export type Project = {
  code: string; // goes into the license for non-legacy projects
  name: string;
  platform: string; // web_desktop | android_apk | desktop | mobile | other
  idFormat: "any" | "hex20"; // "any" = RetailX hardware id strings, "hex20" = XXXX-XXXX-XXXX-XXXX-XXXX
  legacy: boolean; // true = payload exactly like RetailX Hub (no extra fields)
  plans: string[]; // RetailX plan keys offered for this project
  planName: string; // plan_name written when no plan is chosen
  features: FeatureMap; // default feature set
  maxUsers: number;
  builtin?: boolean;
};

export type Plan = { name: string; description: string; max_users: number; features: FeatureMap };

export const PLANS: Record<string, Plan> = CATALOG_DATA.plans;
const LABELS: Record<string, [string, string]> = CATALOG_DATA.labels;
export const MODULES: Record<string, { label: string; description: string }> = CATALOG_DATA.modules;
const PD = CATALOG_DATA.projectDefaults as Record<string, { name: string; platform: string; features: FeatureMap }>;

export const DEFAULT_PROJECTS: Project[] = [
  {
    code: "retailx_360_web", name: PD.retailx_360_web.name, platform: "web_desktop",
    idFormat: "any", legacy: true, plans: ["starter", "standard", "enterprise_erp"],
    planName: "standard", features: PLANS.standard.features, maxUsers: 5, builtin: true,
  },
  {
    code: "retailx_360_apk", name: PD.retailx_360_apk.name, platform: "android_apk",
    idFormat: "any", legacy: true, plans: [], planName: "mobile_pos",
    features: PD.retailx_360_apk.features, maxUsers: 1, builtin: true,
  },
  {
    code: "dpos_desktop", name: PD.dpos_desktop.name, platform: "desktop",
    idFormat: "any", legacy: true, plans: [], planName: "dpos",
    features: PD.dpos_desktop.features, maxUsers: 5, builtin: true,
  },
  {
    code: "retailx_pharmacy", name: PD.retailx_pharmacy.name, platform: "web_desktop",
    idFormat: "any", legacy: true, plans: [], planName: "pharmacy",
    features: PD.retailx_pharmacy.features, maxUsers: 5, builtin: true,
  },
  ...[
    ["darzihub", "DarziHub"],
    ["bpjourney", "BP Journey"],
    ["contracthub", "ContractHub"],
  ].map(([code, name]): Project => ({
    code, name, platform: "mobile", idFormat: "hex20", legacy: false,
    plans: [], planName: "standard", features: {}, maxUsers: 1, builtin: true,
  })),
];

// ---- features ----
export function moduleForKey(key: string): string {
  const k = key.toLowerCase().trim();
  if (k.includes(".")) {
    const p = k.split(".")[0];
    if (p in MODULES) return p;
  }
  if (["variants", "units", "labels"].includes(k) || k.startsWith("inventory")) return "inventory";
  if (k.startsWith("pos") || k === "hold_orders") return "pos";
  if (k.startsWith("warehouse")) return "warehouse";
  if (k.startsWith("purchases") || k === "suppliers") return "purchases";
  if (k.startsWith("customers") || k === "khata") return "customers";
  if (k.startsWith("history")) return "history";
  if (k.startsWith("accounting")) return "accounting";
  if (k.startsWith("dashboard")) return "dashboard";
  if (k.startsWith("reports")) return "reports";
  if (k.startsWith("settings") || ["workspace", "users", "taxes", "activation"].includes(k)) return "settings";
  if (k.startsWith("print") || k.includes("branding")) return "print";
  if (["offline_sales", "bluetooth_printer", "barcode_scanner", "daily_summary", "cloud_backup", "credit_khata"].includes(k)) return "apk";
  if (["cloud_sync", "white_label", "multi_currency", "kds_kitchen"].includes(k)) return "general";
  if (k.includes(".")) return k.split(".")[0];
  return "general";
}

export function featureLabel(key: string): { label: string; description: string } {
  const l = LABELS[key];
  if (l) return { label: l[0], description: l[1] };
  const t = key.replace(/[._]/g, " ");
  return { label: t.charAt(0).toUpperCase() + t.slice(1), description: "" };
}

export type FeatureGroup = { module: string; label: string; keys: string[] };

export function groupFeatures(features: FeatureMap): FeatureGroup[] {
  const by: Record<string, string[]> = {};
  Object.keys(features).sort().forEach((k) => {
    const m = moduleForKey(k);
    (by[m] ||= []).push(k);
  });
  return Object.keys(by)
    .sort()
    .map((m) => ({ module: m, label: MODULES[m]?.label ?? m, keys: by[m] }));
}

export function projectModules(p: Project) {
  return p;
}
