// Wrap your app root with <LicenseGate>. Children render only with a valid license.
import { ReactNode, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { getDeviceId } from "./deviceId";
import { activateLicense, checkSavedLicense, REASON_TEXT } from "./licenseClient";

export default function LicenseGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "locked">("loading");
  const [deviceId, setDeviceId] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const recheck = useCallback(async () => {
    const r = await checkSavedLicense();
    setState(r.ok ? "ok" : "locked");
    if (!r.ok && r.reason !== "format") setError(REASON_TEXT[r.reason]);
  }, []);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
    recheck();
    const sub = AppState.addEventListener("change", (s) => s === "active" && recheck());
    return () => sub.remove();
  }, [recheck]);

  async function activate() {
    const r = await activateLicense(input);
    if (r.ok) { setError(""); setState("ok"); } else setError(REASON_TEXT[r.reason]);
  }

  if (state === "loading") return <View style={s.c}><ActivityIndicator /></View>;
  if (state === "ok") return <>{children}</>;

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
});
