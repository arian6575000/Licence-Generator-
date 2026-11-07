import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import LicenseRow from "../../src/components/LicenseRow";
import { Banner, Btn, Card, Page, SectionTitle } from "../../src/components/ui";
import { STALE_SYNC_DAYS } from "../../src/lib/config";
import { licStatus } from "../../src/lib/status";
import type { ClientRec, LicenseRec } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { C, SP, T } from "../../src/theme";

const todayIso = () => new Date().toISOString().slice(0, 10);

function Stat({ value, label, tone }: { value: number; label: string; tone?: "warn" | "bad" }) {
  const color = tone === "warn" ? C.warn : tone === "bad" ? C.danger : C.text;
  return (
    <Card style={{ flex: 1, alignItems: "center", paddingVertical: SP.md, paddingHorizontal: 6 }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color }}>{value}</Text>
      <Text style={{ color: C.sub, fontSize: 12, textAlign: "center" }}>{label}</Text>
    </Card>
  );
}

function Step({ done, text }: { done: boolean; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 4 }}>
      <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={22} color={done ? C.ok : C.faint} />
      <Text style={{ color: done ? C.sub : C.text, fontSize: T.body, textDecorationLine: done ? "line-through" : "none" }}>{text}</Text>
    </View>
  );
}

export default function Home() {
  const app = useApp();
  const router = useRouter();
  const [lics, setLics] = useState<LicenseRec[]>([]);
  const [clients, setClients] = useState<ClientRec[]>([]);
  const today = todayIso();

  const load = useCallback(async () => {
    const [l, c] = await Promise.all([app.repo.licenses(), app.repo.clients("", true)]);
    setLics(l);
    setClients(c);
  }, [app.repo]);
  useFocusEffect(useCallback(() => { load(); }, [load, app.version])); // eslint-disable-line react-hooks/exhaustive-deps

  const cmap = new Map(clients.map((c) => [c.id, c]));
  const month = today.slice(0, 7);
  const issuedThisMonth = lics.filter((l) => new Date(l.issuedAt * 1000).toISOString().slice(0, 7) === month).length;
  const attention = lics.filter((l) => ["expiring", "expired"].includes(licStatus(l, today))).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const recent = [...lics].sort((a, b) => b.issuedAt - a.issuedAt).slice(0, 5);
  const staleDays = app.sync.lastSyncAt ? Math.floor((Date.now() - app.sync.lastSyncAt) / 86400000) : null;
  const newbie = clients.length === 0 || lics.length === 0;

  return (
    <Page>
      {!app.guard.ok && <Banner tone="bad" text={app.guard.reason} />}
      {app.guard.ok && !app.session && (
        <Banner tone="info" text="You are working offline. Everything you create is saved on this phone and will be sent to the Hub once you sign in." action={{ label: "Sign in to sync", onPress: () => router.push("/login") }} />
      )}
      {app.guard.ok && app.session && staleDays !== null && staleDays >= STALE_SYNC_DAYS && (
        <Banner tone="info" text={`Last synced ${staleDays} days ago. Tap the sync button when you are online to back up your data.`} />
      )}

      <Btn label="New license" icon="add-circle" onPress={() => router.push("/new-license")} disabled={!app.guard.ok} style={{ minHeight: 56 }} />

      {newbie && (
        <Card>
          <Text style={{ fontWeight: "800", fontSize: T.h3, color: C.text, marginBottom: 6 }}>Getting started</Text>
          <Step done={app.hasKeys} text="Signing keys downloaded from the Hub" />
          <Step done={clients.length > 0} text="Add your first client" />
          <Step done={lics.length > 0} text="Create your first license" />
          <Text style={{ color: C.sub, marginTop: 8, fontSize: T.small + 1 }}>
            You only need the internet once, to download the keys. After that you can create clients and licenses anywhere, offline.
          </Text>
        </Card>
      )}

      <View style={{ flexDirection: "row", gap: SP.sm }}>
        <Stat value={issuedThisMonth} label="Issued this month" />
        <Stat value={attention.length} label="Need renewal" tone={attention.length ? "warn" : undefined} />
        <Stat value={app.sync.pending} label="Waiting to sync" tone={app.sync.problems ? "bad" : undefined} />
      </View>

      {attention.length > 0 && (
        <>
          <SectionTitle>Needs renewal</SectionTitle>
          {attention.slice(0, 4).map((l) => (
            <LicenseRow key={l.id} lic={l} client={cmap.get(l.clientId)} today={today} onPress={() => router.push(`/license/${l.id}`)} />
          ))}
          {attention.length > 4 && <Btn kind="ghost" label={`See all ${attention.length}`} onPress={() => router.push("/history")} />}
        </>
      )}

      <SectionTitle>Recent licenses</SectionTitle>
      {recent.length === 0 ? (
        <Text style={{ color: C.sub }}>No licenses yet. Tap “New license” to create the first one.</Text>
      ) : (
        recent.map((l) => <LicenseRow key={l.id} lic={l} client={cmap.get(l.clientId)} today={today} onPress={() => router.push(`/license/${l.id}`)} />)
      )}
    </Page>
  );
}
