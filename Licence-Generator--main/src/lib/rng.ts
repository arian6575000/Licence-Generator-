// Gives tweetnacl a secure random source on React Native.
import nacl from "tweetnacl";
import * as Crypto from "expo-crypto";

nacl.setPRNG((x, n) => {
  const b = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) x[i] = b[i];
});
