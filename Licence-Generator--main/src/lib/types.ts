import type { Payload } from "./licenseCore";
import type { FeatureMap } from "./catalog";

// pending  = created/edited on this phone, not yet accepted by the Hub
// synced   = Hub has it
// rejected = Hub refused it (see syncMessage)
// conflict = Hub reports a conflict (e.g. same device already licensed for another client)
// legacy   = old record from the offline-only version; only pushed when you ask for it
export type SyncState = "pending" | "synced" | "rejected" | "conflict" | "legacy";

export type ClientRec = {
  id: string; // UUID, created on the phone so it works offline
  clientName: string;
  businessName: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  address: string;
  notes: string;
  status: string; // active | lead | suspended | churned | deleted (server-owned)
  revision: number;
  createdAt: number; // ms
  updatedAt: number; // ms
  syncState: SyncState;
  syncMessage: string;
};

export type LicenseRec = {
  id: string; // UUID
  clientId: string;
  projectCode: string;
  projectName: string;
  machineId: string;
  planName: string;
  maxUsers: number;
  issuedAt: number; // unix seconds
  expiryDate: string; // YYYY-MM-DD
  isLifetime: boolean;
  license: string; // MPOS-LIC-...
  payload: Payload | null;
  features: FeatureMap;
  status: string; // server-owned: active | blocked | suspended | expired
  blockReason: string;
  revision: number;
  kid: string;
  origin: "generator" | "server";
  updatedAt: number; // ms
  syncState: SyncState;
  syncMessage: string;
};

// ---- read-only data that comes from the Hub ----
export type HubProject = {
  id: string;
  code: string;
  name: string;
  platform: string;
  kid: string;
  publicKey: string;
  currentVersion: string;
  defaultFeatures: FeatureMap;
};

export type HubPlan = {
  id: string;
  projectCode: string;
  tierCode: string;
  name: string;
  description: string;
  validityType: string;
  validityDays: number;
  isLifetime: boolean;
  maxUsers: number;
  features: FeatureMap;
  price: string;
};

export type HubRelease = {
  id: string;
  brandId: string;
  versionTag: string;
  downloadUrl: string;
  sha256: string;
  fileSizeMb: number;
  releaseNotes: string;
  isActive: boolean;
  createdAt: string;
};

export type Catalog = {
  projects: HubProject[];
  plans: HubPlan[];
  releases: HubRelease[];
  fetchedAt: number;
};

// Signing key as delivered by the Hub bootstrap. Lives ONLY in the secure vault.
export type StoredKey = { kid: string; publicKey: string; privateKey: string };
