import { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import * as LocalAuth from "expo-local-authentication";
import { Banner, Btn, Card, Field, s } from "../../src/components/ui";
import { APP_VERSION, OFFLINE_GRACE_DAYS } from "../../src/lib/config";
import { isValidPin } from "../../src/lib/pin";
import { discardProblem, queueLegacy, retryProblem } from "../../src/lib/sync";
import type { ClientRec, LicenseRec } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { loadPin, savePin, newSalt } from "../../src/native/secure";
import { hashPin, verifyPin } from "../../src/lib/pin";
import { C } from "../../src/theme";

export default function Settings() {
  const app = useApp();
  const { sync, guard, session } = app;
  const [bioOk, setBioOk] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [problems, setProblems] = useState<{ kind: "client" | "license"; id: string; title: string; msg: string }[]>([]);

  useEffect(() => { LocalAuth.hasHardwareAsync().then(async (h) => setBioOk(h && (await LocalAuth.isEnrolledAsync()))); }, []);
  useEffect(() => {
    (async () => {
      const [cs, ls] = await Promise.all([app.repo.clients("", true), app.repo.licenses()]);
      const bad = (x: string) => x === "rejected" || x === "conflict";
      setProblems([
        ...cs.filter((c: ClientRec) => bad(c.syncState)).map((c) => ({ kind: "client" as const, id: c.id, title: `Client: ${c.clientName}`, msg: c.syncMessage })),
        ...ls.filter((l: LicenseRec) => bad(l.syncState)).map((l) => ({ kind: "license" as const, id: l.id, title: `License: ${l.projectName} · ${l.machineId}`, msg: l.syncMessage })),
      ]);
    })();
  }, [app.repo, app.version]);

  const days = sync.lastSyncAt ? Math.floor((Date.now() - sync.lastSyncAt) / 86400000) : null;

  async function changePin() {
    if (!isValidPin(newPin)) return Alert.alert("PIN 4 se 8 digits ka hona chahiye");
    const rec = await loadPin();
    if (!rec || !verifyPin(oldPin, rec.salt, rec.hash)) return Alert.alert("Purana PIN ghalat hai");
    const salt = newSalt();
    await savePin(hashPin(newPin, salt), salt);
    setOldPin(""); setNewPin("");
    Alert.alert("PIN badal gaya");
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      {!guard.ok && <Banner tone="bad" text={guard.reason} />}

      <Text style={s.title}>Hub</Text>
      <Card>
        <Text style={{ color: C.text }}>Login: {session?.username}</Text>
        <Text style={s.sub}>{session?.baseUrl}</Text>
        <Text style={s.sub}>Device: {session?.deviceName} ({session?.deviceId.slice(0, 12)}…)</Text>
        <Text style={s.sub}>
          Aakhri sync: {sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString() : "kabhi nahi"}
          {days !== null ? ` (${days} din pehle, hadd ${OFFLINE_GRACE_DAYS} din)` : ""}
        </Text>
        <Text style={s.sub}>Hub par bhejna baaqi: {sync.pending} · masail: {sync.problems}</Text>
        {!!sync.last?.error && <Text style={{ color: C.danger }}>{sync.last.error}</Text>}
        {sync.last?.offline && <Text style={{ color: C.warn }}>Internet / Hub se rabta nahi hua</Text>}
        <Btn label="Abhi sync karein" onPress={() => app.runSync()} busy={sync.running} style={{ marginTop: 8 }} />
      </Card>

      {sync.legacy > 0 && (
        <Card>
          <Text style={{ fontWeight: "700", color: C.text }}>Purani app ke {sync.legacy} licenses</Text>
          <Text style={s.sub}>Yeh purani offline app se aayi hain aur abhi Hub par nahi gayi. Hub inhein tabhi qabool karta hai jab wohi signing key use hui ho jo Hub ke paas hai.</Text>
          <Btn label="Hub par bhejein" kind="ghost" onPress={async () => { const n = await queueLegacy(app.repo); app.afterChange(); Alert.alert(`${n} licenses bhejne ke liye tayyar`); }} style={{ marginTop: 6 }} />
        </Card>
      )}

      {problems.length > 0 && (
        <>
          <Text style={s.title}>Sync masail ({problems.length})</Text>
          {problems.map((p) => (
            <Card key={p.kind + p.id}>
              <Text style={{ fontWeight: "700", color: C.text }}>{p.title}</Text>
              <Text style={{ color: C.danger }}>{p.msg || "Hub ne qabool nahi kiya"}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Btn label="Dobara bhejein" kind="ghost" onPress={async () => { await retryProblem(app.repo, p.kind, p.id); app.afterChange(); }} style={{ paddingVertical: 8 }} />
                <Btn
                  label="Hata dein" kind="danger" style={{ paddingVertical: 8 }}
                  onPress={async () => {
                    const ok = await discardProblem(app.repo, p.kind, p.id);
                    if (!ok) Alert.alert("Abhi nahi hat sakta", "Is client ke licenses pehle hataen.");
                    app.afterChange();
                  }}
                />
              </View>
            </Card>
          ))}
        </>
      )}

      <Text style={s.title}>Security</Text>
      <Card>
        {bioOk && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: C.text }}>Fingerprint / face se unlock</Text>
            <Switch value={app.biometric} onValueChange={(v) => app.setBiometric(v)} />
          </View>
        )}
        <Field label="Purana PIN" value={oldPin} onChangeText={setOldPin} keyboardType="number-pad" secureTextEntry maxLength={8} />
        <Field label="Naya PIN" value={newPin} onChangeText={setNewPin} keyboardType="number-pad" secureTextEntry maxLength={8} />
        <Btn label="PIN badlein" kind="ghost" onPress={changePin} disabled={oldPin.length < 4 || newPin.length < 4} />
        <Btn label="Abhi lock karein" kind="ghost" onPress={() => app.lock()} />
      </Card>

      <Btn
        label="Logout" kind="danger"
        onPress={() => Alert.alert(
          "Logout?",
          sync.pending > 0 ? `${sync.pending} records abhi Hub par nahi gaye. Logout se signing keys is phone se hat jayengi; records phone par rahenge aur dobara login par chale jayenge.` : "Signing keys is phone se hat jayengi. Data phone par rahega.",
          [{ text: "Nahi" }, { text: "Logout", style: "destructive", onPress: () => app.logout() }]
        )}
      />
      <Text style={{ color: C.sub, textAlign: "center" }}>License Generator v{APP_VERSION}</Text>
    </ScrollView>
  );
}
