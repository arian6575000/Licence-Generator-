import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ClientForm from "../src/components/ClientForm";
import ExpiryPicker, { expiryPreview, useExpiry } from "../src/components/ExpiryPicker";
import FeatureEditor from "../src/components/FeatureEditor";
import { Avatar, Btn, Card, Chip, Field, Pill, SectionTitle, s } from "../src/components/ui";
import { buildProjectList, plansFor, PlanView, ProjectView } from "../src/lib/catalogView";
import { licenseMessage, openWhatsApp } from "../src/lib/contact";
import { generateLicense, normalizeDeviceId, sameDevice } from "../src/lib/generate";
import { shareText } from "../src/lib/share";
import type { Catalog, ClientRec, LicenseRec } from "../src/lib/types";
import type { FeatureMap } from "../src/lib/catalog";
import { useApp } from "../src/state";
import { C, SP, T } from "../src/theme";

const STEPS = ["Client", "App & plan", "Device", "Validity", "Review"];

function Progress({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: SP.lg, paddingTop: SP.md }}>
      {STEPS.map((n, i) => (
        <View key={n} style={{ flex: 1 }}>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: i <= step ? C.primary : C.border }} />
          <Text style={{ fontSize: 11, marginTop: 4, color: i === step ? C.primary : C.faint, fontWeight: i === step ? "800" : "500" }} numberOfLines={1}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

export default function NewLicense() {
  const app = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; projectCode?: string; machineId?: string }>();

  const [step, setStep] = useState(0);
  const [clients, setClients] = useState<ClientRec[]>([]);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [search, setSearch] = useState("");
  const [client, setClient] = useState<ClientRec | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [project, setProject] = useState<ProjectView | null>(null);
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [device, setDevice] = useState("");
  const [maxUsers, setMaxUsers] = useState(1);
  const [features, setFeatures] = useState<FeatureMap>({});
  const [showFeatures, setShowFeatures] = useState(false);
  const [existing, setExisting] = useState<LicenseRec | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<LicenseRec | null>(null);
  const [copied, setCopied] = useState(false);
  const exp = useExpiry("30");

  const projects = useMemo(() => (cat ? buildProjectList(cat) : []), [cat]);
  const plans = useMemo(() => (cat && project ? plansFor(project, cat) : []), [cat, project]);

  const load = useCallback(async () => {
    const [c, k] = await Promise.all([app.repo.clients("", false), app.repo.catalog()]);
    setClients(c);
    setCat(k);
  }, [app.repo]);
  useEffect(() => { load(); }, [load]);

  // pre-fill when opened from a client or from a license being renewed
  useEffect(() => {
    if (params.clientId && clients.length && !client) {
      const c = clients.find((x) => x.id === params.clientId);
      if (c) { setClient(c); setStep(1); }
    }
  }, [params.clientId, clients]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (params.machineId) setDevice(params.machineId);
  }, [params.machineId]);
  useEffect(() => {
    if (params.projectCode && projects.length && !project) pickProject(projects.find((p) => p.code === params.projectCode) ?? null);
  }, [params.projectCode, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickProject(p: ProjectView | null) {
    setProject(p);
    setPlan(null);
    if (p) { setMaxUsers(p.maxUsers); setFeatures(p.features); }
  }
  function pickPlan(p: PlanView) {
    setPlan(p);
    setMaxUsers(p.maxUsers);
    setFeatures(p.features);
  }

  const normalized = normalizeDeviceId(device);
  const deviceError = device.trim() && !normalized ? "The Device ID has 20 characters (0-9 and A-F), like 1A2B-3C4D-5E6F-7A8B-9C0D" : undefined;

  // is there already a live license for this device + app?
  useEffect(() => {
    (async () => {
      setExisting(null);
      if (!normalized || !project) return;
      const today = new Date().toISOString().slice(0, 10);
      const found = (await app.repo.licenses({ projectCode: project.code })).find(
        (l) => sameDevice(l.machineId, normalized) && l.status !== "blocked" && (l.isLifetime || l.expiryDate >= today)
      );
      setExisting(found ?? null);
    })();
  }, [normalized, project, app.repo, app.version]);

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    return !q || [c.clientName, c.businessName, c.phone, c.city].some((v) => v.toLowerCase().includes(q));
  });

  async function paste() {
    try {
      const t = await Clipboard.getStringAsync();
      const m = t.toUpperCase().match(/[0-9A-F]{4}(?:[-\s]?[0-9A-F]{4}){4}/);
      setDevice(m ? m[0] : t.trim());
    } catch {
      Alert.alert("Paste failed", "Could not read the clipboard. Type the Device ID instead.");
    }
  }

  const canNext = [
    !!client,
    !!project && !!plan,
    !!normalized && !existing,
    exp.mode !== "custom" || /^\d{4}-\d{2}-\d{2}$/.test(exp.date),
    true,
  ][step];

  async function generate() {
    if (!client || !project || !plan || !normalized) return;
    setBusy(true);
    try {
      const rec = await generateLicense(app.deps, {
        clientId: client.id, projectCode: project.code, planName: plan.name, machineId: normalized,
        maxUsers, features, expiry: exp.choice(),
      });
      app.afterChange();
      setDone(rec);
    } catch (e: any) {
      Alert.alert("Could not create the license", e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  // ---------- success ----------
  if (done && client) {
    const msg = licenseMessage(done, client.clientName);
    const waTo = client.whatsapp || client.phone;
    return (
      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 6, paddingVertical: SP.md }}>
          <Ionicons name="checkmark-circle" size={64} color={C.ok} />
          <Text style={{ fontSize: T.h2, fontWeight: "800", color: C.text }}>License created</Text>
          <Text style={{ color: C.sub, textAlign: "center" }}>
            {done.projectName} for {client.clientName}. Saved on this phone{app.session ? " and will sync automatically." : " — it will sync when you sign in."}
          </Text>
        </View>
        <Card>
          <Text style={{ color: C.sub, fontSize: T.small + 1 }}>License key</Text>
          <Text selectable numberOfLines={3} style={{ fontFamily: "monospace", color: C.text, marginTop: 4, fontSize: 12 }}>{done.license}</Text>
        </Card>
        <Btn label={`Send on WhatsApp to ${client.clientName.split(" ")[0]}`} icon="logo-whatsapp" onPress={async () => {
          const ok = await openWhatsApp(waTo, msg);
          if (!ok) { Alert.alert("WhatsApp not available", "Opening the share menu instead."); shareText(msg); }
        }} style={{ minHeight: 54 }} />
        <View style={{ flexDirection: "row", gap: SP.sm }}>
          <Btn kind="soft" icon={copied ? "checkmark" : "copy-outline"} label={copied ? "Copied" : "Copy key"} style={{ flex: 1 }} onPress={async () => {
            await Clipboard.setStringAsync(done.license);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }} />
          <Btn kind="soft" icon="share-social-outline" label="Share" style={{ flex: 1 }} onPress={() => shareText(msg)} />
        </View>
        <Btn kind="ghost" label="View license" onPress={() => router.replace(`/license/${done.id}`)} />
        <Btn kind="ghost" label="Create another" onPress={() => { setDone(null); setStep(0); setClient(null); setProject(null); setPlan(null); setDevice(""); }} />
        <Btn kind="ghost" label="Done" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  // ---------- steps ----------
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Progress step={step} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Text style={s.title}>Who is this license for?</Text>
            <Field placeholder="Search by name, phone or city" value={search} onChangeText={setSearch} />
            <Btn kind="soft" icon="person-add-outline" label="Add new client" onPress={() => setFormOpen(true)} />
            {filtered.length === 0 && <Text style={{ color: C.sub }}>{clients.length ? "No client matches your search." : "No clients yet. Add one to continue — no internet needed."}</Text>}
            {filtered.map((c) => (
              <Card key={c.id} onPress={() => setClient(c)} style={client?.id === c.id ? { borderColor: C.primary, borderWidth: 2 } : undefined}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Avatar name={c.clientName} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: C.text }}>{c.clientName}</Text>
                    <Text style={{ color: C.sub, fontSize: T.small + 1 }} numberOfLines={1}>{[c.businessName !== c.clientName ? c.businessName : "", c.phone, c.city].filter(Boolean).join(" · ")}</Text>
                  </View>
                  {client?.id === c.id && <Ionicons name="checkmark-circle" size={24} color={C.primary} />}
                </View>
              </Card>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={s.title}>Which app?</Text>
            {projects.map((p) => (
              <Card key={p.code} onPress={() => pickProject(p)} style={project?.code === p.code ? { borderColor: C.primary, borderWidth: 2 } : undefined}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="apps-outline" size={22} color={C.primary} />
                  <Text style={{ flex: 1, fontWeight: "800", color: C.text }}>{p.name}</Text>
                  {project?.code === p.code && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
                </View>
              </Card>
            ))}
            {project && (
              <>
                <SectionTitle>Plan</SectionTitle>
                {plans.length === 0 && <Text style={{ color: C.sub }}>No plans are defined for this app.</Text>}
                {plans.map((p) => (
                  <Card key={p.key} onPress={() => pickPlan(p)} style={plan?.key === p.key ? { borderColor: C.primary, borderWidth: 2 } : undefined}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "800", color: C.text }}>{p.name}</Text>
                        <Text style={{ color: C.sub, fontSize: T.small + 1 }}>{p.description ? `${p.description} · ` : ""}{p.maxUsers} user{p.maxUsers === 1 ? "" : "s"}</Text>
                      </View>
                      {plan?.key === p.key && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.title}>Device ID</Text>
            <Text style={{ color: C.sub }}>Ask the client to open the app’s activation screen and send you the Device ID. Paste it here.</Text>
            <Field
              label="Device ID" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" autoCorrect={false}
              value={device} onChangeText={setDevice} error={deviceError}
              hint={normalized ? `Looks good: ${normalized}` : undefined}
              right={<Btn small kind="soft" icon="clipboard-outline" label="Paste" onPress={paste} />}
            />
            {existing && (
              <Card style={{ borderColor: C.warn }}>
                <Text style={{ fontWeight: "800", color: C.text }}>This device already has an active license</Text>
                <Text style={{ color: C.sub, marginVertical: 6 }}>{existing.projectName} · expires {existing.isLifetime ? "never" : existing.expiryDate}. Renew it instead of creating a new one.</Text>
                <Btn label="Renew this license" icon="refresh" onPress={() => router.replace(`/license/${existing.id}`)} />
              </Card>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.title}>Validity & limits</Text>
            <ExpiryPicker mode={exp.mode} setMode={exp.setMode} date={exp.date} setDate={exp.setDate} />
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ flex: 1, fontWeight: "800", color: C.text }}>Maximum users</Text>
                <Btn small kind="ghost" label="−" onPress={() => setMaxUsers((n) => Math.max(1, n - 1))} />
                <Text style={{ fontSize: T.h3, fontWeight: "800", minWidth: 28, textAlign: "center", color: C.text }}>{maxUsers}</Text>
                <Btn small kind="ghost" label="+" onPress={() => setMaxUsers((n) => n + 1)} />
              </View>
            </Card>
            <Card onPress={() => setShowFeatures((v) => !v)}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ flex: 1, fontWeight: "800", color: C.text }}>{Object.values(features).filter((v) => v === true).length} features included</Text>
                <Text style={{ color: C.primary, fontWeight: "700" }}>{showFeatures ? "Hide" : "Customize"}</Text>
              </View>
            </Card>
            {showFeatures && <FeatureEditor features={features} onChange={setFeatures} />}
          </>
        )}

        {step === 4 && client && project && plan && (
          <>
            <Text style={s.title}>Review</Text>
            <Card style={{ gap: 10 }}>
              {[
                ["Client", client.clientName],
                ["App", project.name],
                ["Plan", plan.name],
                ["Device ID", normalized ?? ""],
                ["Valid until", expiryPreview(exp.mode, exp.date)],
                ["Max users", String(maxUsers)],
                ["Features", `${Object.values(features).filter((v) => v === true).length} included`],
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Text style={{ color: C.sub }}>{k}</Text>
                  <Text style={{ color: C.text, fontWeight: "700", flexShrink: 1, textAlign: "right" }}>{v}</Text>
                </View>
              ))}
            </Card>
            <Pill text="Created on this phone — no internet needed" tone="info" />
          </>
        )}
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: SP.sm, padding: SP.lg, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.border }}>
        {step > 0 && <Btn kind="ghost" label="Back" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
        {step < 4 ? (
          <Btn label="Next" onPress={() => setStep(step + 1)} disabled={!canNext} style={{ flex: 2 }} />
        ) : (
          <Btn label="Create license" icon="key" onPress={generate} busy={busy} style={{ flex: 2 }} />
        )}
      </View>

      <ClientForm visible={formOpen} onClose={() => setFormOpen(false)} onSaved={(c) => { setFormOpen(false); setClients((p) => [c, ...p]); setClient(c); }} />
    </View>
  );
}
