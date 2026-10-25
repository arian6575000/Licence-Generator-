export type LicenseRecord = {
  id: string;
  app: string;
  deviceId: string;
  name: string;
  issuedAt: number; // unix seconds
  expiresAt: number; // 0 = lifetime
  license: string;
};

export type KeyPair = { publicKey: string; secretKey: string };
