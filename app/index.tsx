import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import FeatureEditor from "../src/components/FeatureEditor";
import { FeatureMap, PLANS, Project } from "../src/lib/catalog";
import { buildPayload, isoDate, normalizeDeviceId, signLicense } from "../src/lib/licenseCore";
import { loadKeys } from "../src/lib/keys";
import { loadProjects } from "../src/lib/projects";
import { addRecord } from "../src/lib/history";
import { shareText } from "../src/lib/share";
import type { KeyPair } from "../src/lib/types";
import { C } from "../src/theme";

type Mode = "7" | "30" | "90" | "180" | "365" | "lifetime" | "custom";
const PRESETS: { id: Mode; label: string }[] = [
  { id: "7", label: "7 din" }, { id: "30", label: "30 din" }, { id: "90", label: "90 din" },
  { id: "180", label: "180 din" }, { id: "365", label: "1 saal" }, { id: "lifetime", label: "Lifetime" },
  { id: "custom", label: "Custom date" },
];

export default function Generate() {
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [code, setCode] = useState("");
  const [planKey, setPlanKey] = useState("");
  const [features, setFeatures] = useState<FeatureMap>({});
  const [maxUsers, setMaxUsers] = useState("1");
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [machineId, setMachineId] = useState("");
  const [mode, setMode] = useState<Mode>("30");
  const [customDate, setCustomDate] = useState("");
  const [showFeatures, setShowFeatures] = useState(false);
  const [result, setResult] = useState<{ license: string; expiry: string; lifetime: boolean } | null>(null);
  const [msg, setMsg] = useState("");

  const project = useMemo(() => projects.find((p) => p.code === code), [projects, code]);

  const pick = useCallback((p: Project) => {
    setCode(p.code);
    setPlanKey("");
    setFeatures({ ...p.features });
    setMaxUsers(String(p.maxUsers));
    setResult(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadKeys().then(setKeys);
      loadProjects().then((list) => {
        setProjects(list);
        const cur = list.find((p) => p.code === code);
        if (!cur && list.length) pick(list[0]);
      });
    }, [code, pick])
  );

  function choosePlan(k: string) {
    setPlanKey(k);
    setFeatures({ ...PLANS[k].features });
    setMaxUsers(String(PLANS[k].max_users));
  }

  const idOk = project?.idFormat === "hex20" ? normalizeDeviceId(machineId) !== null : machineId.trim() !== "";

  async function generate() {
    try {
      if (!keys) throw new Error("Pehle Keys tab mein key pair banayen");
      if (!project) throw new Error("Project chunein");
      const expiry =
        mode === "lifetime" ? ("lifetime" as const) : mode === "custom" ? { date: customDate.trim() } : { days: parseInt(mode, 10) };
      const payload = buildPayload({
        machineId, clientName: client, planName: planKey || project.planName, maxUsers: parseInt(maxUsers, 10),
        features, expiry, idFormat: project.idFormat, project: { code: project.code, legacy: project.legacy },
      });
      const license = signLicense(payload, keys.privateKeyHex);
      await addRecord({
        id: payload.license_id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
        projectCode: project.code, projectName: project.name, clientName: payload.client_name, phone: phone.trim(),
        machineId: payload.machine_id, planName: payload.plan_name, maxUsers: payload.max_users,
        issuedAt: Math.floor(Date.now() / 1000), expiryDate: payload.expiry_date, isLifetime: payload.is_lifetime,
        license, payload,
      });
      setResult({ license, expiry: payload.expiry_date, lifetime: payload.is_lifetime });
      setMsg("");
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
          <Text style={{ color: C.danger }}>Key pair maujood nahi. Keys tab kholein: naya banayen ya RetailX wali private key import karein.</Text>
        </View>
      )}

      <Text style={s.label}>Project</Text>
      <View style={s.row}>
        {projects.map((p) => (
          <Pressable key={p.code} onPress={() => pick(p)} style={[s.chip, p.code === code && s.chipOn]}>
            <Text style={p.code === code ? { color: "#fff" } : undefined}>{p.name}</Text>
          </Pressable>
        ))}
      </View>

      {project && project.plans.length > 0 && (
        <>
          <Text style={s.label}>Plan</Text>
          <View style={s.row}>
            {project.plans.map((k) => (
              <Pressable key={k} onPress={() => choosePlan(k)} style={[s.chip, planKey === k && s.chipOn]}>
                <Text style={planKey === k ? { color: "#fff" } : undefined}>{PLANS[k].name}</Text>
              </Pressable>
            ))}
          </View>
          {planKey !== "" && <Text style={{ color: C.sub }}>{PLANS[planKey].description}</Text>}
        </>
      )}

      <Text style={s.label}>Client name</Text>
      <TextInput style={s.input} value={client} onChangeText={setClient} placeholder="Ali Store" />
      <Text style={s.label}>Phone (sirf aap ke record ke liye)</Text>
      <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="03xx..." keyboardType="phone-pad" />

      <Text style={s.label}>{project?.idFormat === "hex20" ? "Device ID" : "Machine / Hardware ID"}</Text>
      <TextInput
        style={[s.input, machineId && !idOk ? { borderColor: C.danger } : null]}
        value={machineId}
        onChangeText={setMachineId}
        placeholder={project?.idFormat === "hex20" ? "XXXX-XXXX-XXXX-XXXX-XXXX" : "Client ke software mein dikhne wali ID"}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {machineId !== "" && !idOk && <Text style={{ color: C.danger }}>20 hex characters (0-9, A-F) chahiye</Text>}

      <Text style={s.label}>Muddat</Text>
      <View style={s.row}>
        {PRESETS.map((p) => (
          <Pressable key={p.id} onPress={() => setMode(p.id)} style={[s.chip, mode === p.id && s.chipOn]}>
            <Text style={mode === p.id ? { color: "#fff" } : undefined}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      {mode === "custom" && (
        <TextInput style={s.input} value={customDate} onChangeText={setCustomDate} placeholder={`YYYY-MM-DD (e.g. ${isoDate(new Date(Date.now() + 90 * 86400000))})`} />
      )}

      <Text style={s.label}>Max users</Text>
      <TextInput style={s.input} value={maxUsers} onChangeText={setMaxUsers} keyboardType="number-pad" />

      <Pressable style={s.link} onPress={() => setShowFeatures(!showFeatures)}>
        <Text style={{ color: C.primary, fontWeight: "600" }}>
          {showFeatures ? "Features chhupayen ▲" : `Features badlein (${Object.values(features).filter((v) => v === true).length} on) ▼`}
        </Text>
      </Pressable>
      {showFeatures && <FeatureEditor features={features} onChange={setFeatures} />}

      <Pressable style={s.btn} onPress={generate}><Text style={s.btnText}>License generate karein</Text></Pressable>

      {result && (
        <View style={s.card}>
          <Text style={s.label}>License ({result.lifetime ? "Lifetime" : `expiry: ${result.expiry}`})</Text>
          <Text selectable style={s.mono}>{result.license}</Text>
          <Pressable style={[s.btn, { marginTop: 8 }]} onPress={share}><Text style={s.btnText}>Copy / Share</Text></Pressable>
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
  link: { paddingVertical: 6 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  mono: { fontFamily: "monospace", fontSize: 11, color: C.text, marginTop: 6 },
});
