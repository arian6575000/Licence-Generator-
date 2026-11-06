import { useEffect, useState } from "react";
import { Alert, Switch, Text, View } from "react-native";
import * as LocalAuth from "expo-local-authentication";
import { useRouter } from "expo-router";
import { Banner, Btn, Card, Field, InfoRow, Page, SectionTitle } from "../../src/components/ui";
import { APP_VERSION, COMPANY_CREDIT } from "../../src/lib/config";
import { hashPin, isValidPin, verifyPin } from "../../src/lib/pin";
import { discardProblem, queueLegacy, retryProblem } from "../../src/lib/sync";
import type { ClientRec, LicenseRec } from "../../src/lib/types";
import { loadPin, newSalt, savePin } from "../../src/native/secure";
import { useApp } from "../../src/state";
import { C, T } from "../../src/theme";

export default function Settings() {
  const app = useApp();
  const router = useRouter();
  const { sync, guard, session } = app;
  const [bioOk, setBioOk] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [changing, setChanging] = useState(false);
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

  async function changePin() {
    if (!isValidPin(newPin)) return Alert.alert("PIN must be 4 to 8 digits");
    const rec = await loadPin();
    if (!rec || !verifyPin(oldPin, rec.salt, rec.hash)) return Alert.alert("The current PIN is wrong");
    const salt = newSalt();
    await savePin(hashPin(newPin, salt), salt);
    setOldPin(""); setNewPin(""); setChanging(false);
    Alert.alert("PIN changed");
  }

  const lastSync = sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString() : "Never";

  return (
    <Page>
      {!guard.ok && <Banner tone="bad" text={guard.reason} />}

      <SectionTitle>Account & sync</SectionTitle>
      <Card>
        {session ? (
          <>
            <InfoRow icon="person-outline" label="Signed in as" value={session.username} />
            <InfoRow icon="phone-portrait-outline" label="This phone" value={session.deviceName} />
          </>
        ) : (
          <Text style={{ color: C.sub }}>You are not signed in. Everything still works offline; sign in to back up your data to the Hub.</Text>
        )}
        <InfoRow icon="time-outline" label="Last synced" value={lastSync} />
        <InfoRow icon="cloud-upload-outline" label="Waiting to sync" value={String(sync.pending)} />
        {!!sync.last?.error && <Text style={{ color: C.danger }}>{sync.last.error}</Text>}
        {sync.last?.offline && <Text style={{ color: C.warn }}>Could not reach the Hub. Check your internet connection.</Text>}
        {session
          ? <Btn label="Sync now" icon="sync" onPress={() => app.runSync()} busy={sync.running} style={{ marginTop: 8 }} />
          : <Btn label="Sign in to sync" icon="log-in-outline" onPress={() => router.push("/login")} style={{ marginTop: 8 }} />}
      </Card>

      {problems.length > 0 && (
        <>
          <SectionTitle>{`Needs attention (${problems.length})`}</SectionTitle>
          {problems.map((p) => (
            <Card key={p.kind + p.id}>
              <Text style={{ fontWeight: "800", color: C.text }}>{p.title}</Text>
              <Text style={{ color: C.danger }}>{p.msg || "The Hub did not accept this record."}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Btn small kind="ghost" label="Try again" onPress={async () => { await retryProblem(app.repo, p.kind, p.id); app.afterChange(); }} style={{ flex: 1 }} />
                <Btn small kind="danger" label="Remove" style={{ flex: 1 }} onPress={async () => {
                  const ok = await discardProblem(app.repo, p.kind, p.id);
                  if (!ok) Alert.alert("Cannot remove yet", "Remove this client’s licenses first.");
                  app.afterChange();
                }} />
              </View>
            </Card>
          ))}
        </>
      )}

      {sync.legacy > 0 && (
        <Card>
          <Text style={{ fontWeight: "800", color: C.text }}>{sync.legacy} license{sync.legacy === 1 ? "" : "s"} from the old app</Text>
          <Text style={{ color: C.sub, marginVertical: 4 }}>These were created before sync existed. The Hub accepts them only if they were signed with the same key it has.</Text>
          <Btn kind="ghost" label="Send to Hub" onPress={async () => { const n = await queueLegacy(app.repo); app.afterChange(); Alert.alert(`${n} license${n === 1 ? "" : "s"} queued`, "They will be sent on the next sync."); }} />
        </Card>
      )}

      <SectionTitle>Apps & keys</SectionTitle>
      <Btn kind="ghost" icon="key-outline" label="View apps and key status" onPress={() => router.push("/projects")} />

      <SectionTitle>Security</SectionTitle>
      <Card style={{ gap: 10 }}>
        {bioOk && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: C.text, fontSize: T.body }}>Unlock with fingerprint / face</Text>
            <Switch value={app.biometric} onValueChange={(v) => app.setBiometric(v)} />
          </View>
        )}
        {changing ? (
          <>
            <Field label="Current PIN" value={oldPin} onChangeText={setOldPin} keyboardType="number-pad" secureTextEntry maxLength={8} />
            <Field label="New PIN" value={newPin} onChangeText={setNewPin} keyboardType="number-pad" secureTextEntry maxLength={8} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Btn kind="ghost" label="Cancel" style={{ flex: 1 }} onPress={() => { setChanging(false); setOldPin(""); setNewPin(""); }} />
              <Btn label="Save PIN" style={{ flex: 1 }} onPress={changePin} disabled={oldPin.length < 4 || newPin.length < 4} />
            </View>
          </>
        ) : (
          <Btn kind="ghost" label="Change PIN" onPress={() => setChanging(true)} />
        )}
        <Btn kind="ghost" icon="lock-closed-outline" label="Lock now" onPress={() => app.lock()} />
      </Card>

      {session && (
        <Btn kind="danger" label="Sign out and remove keys" onPress={() => Alert.alert(
          "Sign out and remove keys?",
          `The signing keys will be removed from this phone, so you cannot create licenses until you sign in again. ${sync.pending > 0 ? `${sync.pending} item(s) are not on the Hub yet; they stay on this phone and will sync after you sign in again.` : "Your data stays on this phone."}`,
          [{ text: "Cancel" }, { text: "Sign out", style: "destructive", onPress: () => app.logout() }]
        )} />
      )}

      <View style={{ alignItems: "center", gap: 2, marginTop: 8 }}>
        <Text style={{ color: C.sub }}>License Generator v{APP_VERSION}</Text>
        <Text style={{ color: C.faint, fontSize: T.small }}>{COMPANY_CREDIT}</Text>
      </View>
    </Page>
  );
}
