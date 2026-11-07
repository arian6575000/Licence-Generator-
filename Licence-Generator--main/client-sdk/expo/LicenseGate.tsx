// Wrap your app root with <LicenseGate>. Children render only with a valid license.
// Use useLicense() inside to read plan / features / days left.
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { getDeviceId } from "./deviceId";
import { activateLicense, checkSavedLicense, REASON_TEXT } from "./licenseClient";
import type { Payload } from "./licenseCore";

const Ctx = createContext<{ payload: Payload; daysLeft: number | null } | null>(null);
export const useLicense = () => useContext(Ctx);

export default function LicenseGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "locked">("loading");
  const [info, setInfo] = useState<{ payload: Payload; daysLeft: number | null } | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const apply = (r: Awaited<ReturnType<typeof checkSavedLicense>>) => {
    if (r.ok) { setInfo({ payload: r.payload, daysLeft: r.daysLeft }); setState("ok"); setError(""); }
    else { setState("locked"); if (r.reason !== "format") setError(REASON_TEXT[r.reason]); }
  };
  const recheck = useCallback(async () => apply(await checkSavedLicense()), []);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
    recheck();
    const sub = AppState.addEventListener("change", (s) => s === "active" && recheck());
    return () => sub.remove();
  }, [recheck]);

  async function activate() { apply(await activateLicense(input)); }

  if (state === "loading") return <View style={s.c}><ActivityIndicator /></View>;
  if (state === "ok" && info) {
    const warn = info.daysLeft !== null && info.daysLeft <= 3;
    return (
      <Ctx.Provider value={info}>
        {warn && <Text style={s.warn}>License {info.daysLeft} din mein khatam ho raha hai. Renew ke liye rabta karein.</Text>}
        {children}
      </Ctx.Provider>
    );
  }

  return (
    <View style={s.c}>
      <Text style={s.h}>Activation zaroori hai</Text>
      <Text>Aap ka Device ID:</Text>
      <Text selectable style={s.id}>{deviceId}</Text>
      <Pressable onPress={() => Share.share({ message: deviceId })}>
        <Text style={{ color: "#1D4ED8", marginBottom: 12 }}>Device ID share karein</Text>
      </Pressable>
      <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="License yahan paste karein"
        autoCapitalize="none" autoCorrect={false} multiline />
      {error !== "" && <Text style={{ color: "#B91C1C" }}>{error}</Text>}
      <Pressable style={s.btn} onPress={activate}><Text style={{ color: "#fff", fontWeight: "700" }}>Activate</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  h: { fontSize: 22, fontWeight: "700" },
  id: { fontSize: 18, fontFamily: "monospace", fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, padding: 12, minHeight: 80 },
  btn: { backgroundColor: "#1D4ED8", padding: 14, borderRadius: 10, alignItems: "center" },
  warn: { backgroundColor: "#FEF3C7", color: "#92400E", padding: 8, textAlign: "center" },
});
