import type { Payload } from "./licenseCore";

export type LicenseRecord = {
  id: string; // local record id
  projectCode: string;
  projectName: string;
  clientName: string;
  phone: string; // not signed, for your records
  machineId: string;
  planName: string;
  maxUsers: number;
  issuedAt: number; // unix seconds
  expiryDate: string; // YYYY-MM-DD
  isLifetime: boolean;
  license: string;
  payload: Payload;
};

export type KeyPair = { privateKeyHex: string; publicKeyHex: string };
