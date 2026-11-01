import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import ClientPicker from "../../src/components/ClientPicker";
import ExpiryPicker, { useExpiry } from "../../src/components/ExpiryPicker";
import FeatureEditor from "../../src/components/FeatureEditor";
import { Banner, Btn, Card, Chip, Field, s } from "../../src/components/ui";
import type { FeatureMap } from "../../src/lib/catalog";
import { buildProjectList, plansFor, PlanView } from "../../src/lib/catalogView";
import { generateLicense } from "../../src/lib/generate";
import { normalizeDeviceId } from "../../src/lib/licenseCore";
import { shareText } from "../../src/lib/share";
import type { Catalog, ClientRec, LicenseRec } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { C } from "../../src/theme";

export default function Generate() {
  const app = useApp();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const [cat, setCat] = useState<Catalog>({ projects: [], plans: [], releases: [], fetchedAt: 0 });
  const [client, setClient] = useState<ClientRec | null>(null);
  const [picker, setPicker] = useState(false);
  const [code, setCode] = useState("");
  const [planKey, setPlanKey] = useState("");
  const [features, setFeatures] = useState<FeatureMap>({});
  const [maxUsers, setMaxUsers] = useState("1");
  const [machineId, setMachineId] = useState("");
  const [showFeatures, setShowFeatures] = useState(false);
  const [result, setResult] = useState<LicenseRec | null>(null);
  const [busy, setBusy] = useState(false);
  const exp = useExpiry("30");

  const projects = useMemo(() => buildProjectList(cat), [cat]);
  const project = useMemo(() => projects.find((p) => p.code === code), [projects, code]);
  const plans: PlanView[] = useMemo(() => (project ? plansFor(project, cat) : []), [project, cat]);

  const pick = useCallback((p: (typeof projects)[number]) => {
    setCode(p.code);
    setPlanKey("");
    setFeatures({ ...p.features });
    setMaxUsers(String(p.maxUsers));
    setResult(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      app.repo.catalog().then((c) => {
        setCat(c);
        if (!code) {
          const list = buildProjectList(c);
          if (list.length) pick(list[0]);
        }
      });
    }, [app.repo, app.version, code, pick])
  );

  useEffect(() => {
    if (params.clientId) app.repo.client(params.clientId).then((c) => c && setClient(c));
  }, [params.clientId, app.repo]);

  function choosePlan(p: PlanView) {
    setPlanKey(p.key);
    setFeatures({ ...p.features });
    setMaxUsers(String(p.maxUsers));
  }

  const idOk = !project ? false : project.idFormat === "hex20" ? normalizeDeviceId(machineId) !== null : machineId.trim() !== "";

  async function generate() {
    if (!client) return Alert.alert("Client chunein", "Pehle client chunein ya naya banayen");
    if (!project) return Alert.alert("Project chunein");
    setBusy(true);
    try {
      const rec = await generateLicense(app.deps, {
        clientId: client.id, projectCode: project.code, planName: planKey || project.planName, machineId,
        maxUsers: parseInt(maxUsers, 10), features, expiry: exp.choice(),
      });
      setResult(rec);
      app.afterChange();
    } catch (e: any) {
      Alert.alert("License nahi bani", e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      {!app.guard.ok && <Banner tone="bad" text={app.guard.reason} />}
      {cat.fetchedAt === 0 && app.guard.ok && <Banner text="Hub ka data abhi nahi aaya. Sync karein." />}

      <Text style={s.label}>Client</Text>
      <Card>
        {client ? (
          <>
            <Text style={{ fontWeight: "700", color: C.text }}>{client.clientName}</Text>
            <Text style={s.sub}>{client.businessName} · {client.phone}</Text>
          </>
        ) : (
          <Text style={s.sub}>Koi client nahi chuna</Text>
        )}
        <Btn label={client ? "Client badlein" : "Client chunein / naya banayen"} kind="ghost" onPress={() => setPicker(true)} style={{ marginTop: 6 }} />
      </Card>
      <ClientPicker visible={picker} onClose={() => setPicker(false)} onPick={(c) => { setClient(c); setPicker(false); }} />

      <Text style={s.label}>Project</Text>
      <View style={s.row}>
        {projects.map((p) => <Chip key={p.code} label={p.name} on={p.code === code} onPress={() => pick(p)} />)}
      </View>

      {plans.length > 0 && (
        <>
          <Text style={s.label}>Plan</Text>
          <View style={s.row}>
            {plans.map((p) => <Chip key={p.key} label={p.name} on={planKey === p.key} onPress={() => choosePlan(p)} />)}
          </View>
          {planKey !== "" && <Text style={{ color: C.sub }}>{plans.find((p) => p.key === planKey)?.description}</Text>}
        </>
      )}

      <Field
        label={project?.idFormat === "hex20" ? "Device ID" : "Machine / Hardware ID"}
        value={machineId} onChangeText={setMachineId}
        placeholder={project?.idFormat === "hex20" ? "XXXX-XXXX-XXXX-XXXX-XXXX" : "Client ke software mein dikhne wali ID"}
        autoCapitalize="characters" autoCorrect={false}
        error={machineId !== "" && !idOk ? "20 hex characters (0-9, A-F) chahiye" : undefined}
      />

      <ExpiryPicker {...exp} />

      <Field label="Max users" value={maxUsers} onChangeText={setMaxUsers} keyboardType="number-pad" />

      <Btn label={showFeatures ? "Features chhupayen ▲" : `Features badlein (${Object.values(features).filter((v) => v === true).length} on) ▼`} kind="ghost" onPress={() => setShowFeatures(!showFeatures)} />
      {showFeatures && <FeatureEditor features={features} onChange={setFeatures} />}

      <Btn label="License generate karein" onPress={generate} busy={busy} disabled={!app.guard.ok || !client || !project || !idOk} />

      {result && (
        <Card>
          <Text style={s.label}>License ({result.isLifetime ? "Lifetime" : `expiry: ${result.expiryDate}`})</Text>
          <Text selectable style={[s.mono, { marginTop: 6 }]}>{result.license}</Text>
          <Btn label="Copy / Share" onPress={() => shareText(result.license)} style={{ marginTop: 8 }} />
          <Text style={{ color: C.sub, marginTop: 6 }}>Hub par bhejna: internet milte hi apne aap ho jayega.</Text>
        </Card>
      )}
    </ScrollView>
  );
}
