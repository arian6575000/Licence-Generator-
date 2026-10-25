import { useCallback, useState } from "react";
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { buildPayload, normalizeDeviceId, signLicense } from "../src/lib/licenseCore";
import { loadKeys } from "../src/lib/keys";
import { addRecord, distinctApps } from "../src/lib/history";
import { shareText } from "../src/lib/share";
import type { KeyPair } from "../src/lib/types";
import { C } from "../src/theme";

const PRESETS: { label: string; days: number | "lifetime" }[] = [
  { label: "7 din", days: 7 },
  { label: "30 din", days: 30 },
  { label: "90 din", days: 90 },
  { label: "180 din", days: 180 },
  { label: "1 saal", days: 365 },
  { label: "Lifetime", days: "lifetime" },
];

const fmt = (t: number) => (t === 0 ? "Lifetime" : new Date(t * 1000).toLocaleDateString());

export default function Generate() {
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [apps, setApps] = useState<string[]>([]);
  const [app, setApp] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [days, setDays] = useState<number | "lifetime">(30);
  const [custom, setCustom] = useState("");
  const [result, setResult] = useState<{ license: string; exp: number } | null>(null);
  const [msg, setMsg] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadKeys().then(setKeys);
      distinctApps().then(setApps);
    }, [])
  );

  const idOk = normalizeDeviceId(deviceId) !== null;

  async function generate() {
    try {
      if (!keys) throw new Error("Pehle Keys tab mein key pair banayen");
      const d = custom.trim() ? parseInt(custom, 10) : days;
      const payload = buildPayload({ app, deviceId, name, days: d });
      const license = signLicense(payload, keys.secretKey);
      await addRecord({
        id: payload.id, app: payload.app, deviceId: payload.did, name: payload.name,
        issuedAt: payload.iat, expiresAt: payload.exp, license,
      });
      setResult({ license, exp: payload.exp });
      setMsg("");
      distinctApps().then(setApps);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? String(e));
    }
  }

  async function share() {
    if (!result) return;
    const r = await shareText(result.license);
    setMsg(r === "copied" ? "Copy ho gaya" : "");
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      {!keys && (
        <View style={[s.card, { borderColor: C.danger }]}>
          <Text style={{ color: C.danger }}>Key pair maujood nahi. Keys tab kholein aur "Naya key pair banayen" dabayen.</Text>
        </View>
      )}

      <Text style={s.label}>App code</Text>
      <TextInput style={s.input} value={app} onChangeText={setApp} placeholder="darzihub" autoCapitalize="none" />
      {apps.length > 0 && (
        <View style={s.row}>
          {apps.map((a) => (
            <Pressable key={a} onPress={() => setApp(a)} style={s.chip}><Text>{a}</Text></Pressable>
          ))}
        </View>
      )}

      <Text style={s.label}>Device ID</Text>
      <TextInput
        style={[s.input, deviceId && !idOk ? { borderColor: C.danger } : null]}
        value={deviceId}
        onChangeText={setDeviceId}
        placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {deviceId !== "" && (
        <Text style={{ color: idOk ? C.ok : C.danger }}>
          {idOk ? `OK: ${normalizeDeviceId(deviceId)}` : "20 hex characters (0-9, A-F) chahiye"}
        </Text>
      )}

      <Text style={s.label}>Customer name</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ali Tailors" />

      <Text style={s.label}>Muddat</Text>
      <View style={s.row}>
        {PRESETS.map((p) => {
          const on = !custom && days === p.days;
          return (
            <Pressable key={p.label} onPress={() => { setDays(p.days); setCustom(""); }} style={[s.chip, on && s.chipOn]}>
              <Text style={on ? { color: "#fff" } : undefined}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={s.input}
        value={custom}
        onChangeText={setCustom}
        placeholder="Ya custom din likhein (e.g. 45)"
        keyboardType="number-pad"
      />

      <Pressable style={s.btn} onPress={generate}><Text style={s.btnText}>License generate karein</Text></Pressable>

      {result && (
        <View style={s.card}>
          <Text style={s.label}>License (expiry: {fmt(result.exp)})</Text>
          <Text selectable style={s.mono}>{result.license}</Text>
          <Pressable style={[s.btn, { marginTop: 8 }]} onPress={share}>
            <Text style={s.btnText}>Copy / Share</Text>
          </Pressable>
          {msg !== "" && <Text style={{ color: C.ok, marginTop: 6 }}>{msg}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  label: { fontWeight: "600", color: C.text },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  btn: { backgroundColor: C.primary, padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  mono: { fontFamily: "monospace", fontSize: 12, color: C.text, marginTop: 6 },
});
