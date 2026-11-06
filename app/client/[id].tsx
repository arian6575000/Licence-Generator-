import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import ClientForm from "../../src/components/ClientForm";
import LicenseRow, { SyncPill } from "../../src/components/LicenseRow";
import { Action, Avatar, Btn, Card, InfoRow, Page, SectionTitle } from "../../src/components/ui";
import { callLink, openDialer, openEmail, openWhatsApp } from "../../src/lib/contact";
import { discardProblem, retryProblem } from "../../src/lib/sync";
import type { ClientRec, LicenseRec } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { C, SP, T } from "../../src/theme";

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const [c, setC] = useState<ClientRec | null | undefined>(undefined);
  const [lics, setLics] = useState<LicenseRec[]>([]);
  const [edit, setEdit] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setC((await app.repo.client(String(id))) ?? null);
    setLics(await app.repo.licenses({ clientId: String(id) }));
  }, [app.repo, id]);
  useFocusEffect(useCallback(() => { load(); }, [load, app.version])); // eslint-disable-line react-hooks/exhaustive-deps

  if (c === undefined) return <Page><Text style={{ color: C.sub }}>Loading…</Text></Page>;
  if (c === null) return <Page><Text style={{ color: C.sub }}>This client was not found.</Text></Page>;

  const active = lics.filter((l) => l.isLifetime || l.expiryDate >= today).length;
  const since = new Date(c.createdAt).toISOString().slice(0, 10);

  return (
    <Page>
      <Card style={{ alignItems: "center", gap: 6, paddingVertical: SP.xl }}>
        <Avatar name={c.clientName} size={72} />
        <Text style={{ fontSize: T.h2, fontWeight: "800", color: C.text }}>{c.clientName}</Text>
        {c.businessName !== c.clientName && <Text style={{ color: C.sub }}>{c.businessName}</Text>}
        {c.syncState !== "synced" && <SyncPill state={c.syncState} />}
        <View style={{ flexDirection: "row", gap: SP.lg, marginTop: SP.md }}>
          <Action icon="call" label="Call" onPress={async () => { if (!(await openDialer(c.phone))) Alert.alert("Cannot open the dialer", callLink(c.phone)); }} />
          <Action icon="logo-whatsapp" label="WhatsApp" tone="ok" onPress={async () => { if (!(await openWhatsApp(c.whatsapp || c.phone))) Alert.alert("WhatsApp is not available on this phone"); }} />
          <Action icon="mail" label="Email" disabled={!c.email} onPress={() => openEmail(c.email)} />
          <Action icon="key" label="License" onPress={() => router.push({ pathname: "/new-license", params: { clientId: c.id } })} />
        </View>
      </Card>

      {!!c.syncMessage && <Text style={{ color: C.danger }}>{c.syncMessage}</Text>}
      {(c.syncState === "rejected" || c.syncState === "conflict") && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn kind="ghost" label="Try again" style={{ flex: 1 }} onPress={async () => { await retryProblem(app.repo, "client", c.id); app.afterChange(); }} />
          <Btn kind="danger" label="Remove" style={{ flex: 1 }} onPress={async () => {
            const ok = await discardProblem(app.repo, "client", c.id);
            if (!ok) Alert.alert("Cannot remove", "Remove this client’s licenses first.");
            else { app.afterChange(); router.back(); }
          }} />
        </View>
      )}

      <Card>
        <InfoRow icon="call-outline" label="Phone" value={c.phone} selectable />
        {c.whatsapp !== c.phone && <InfoRow icon="logo-whatsapp" label="WhatsApp" value={c.whatsapp} selectable />}
        {!!c.email && <InfoRow icon="mail-outline" label="Email" value={c.email} selectable />}
        {!!c.city && <InfoRow icon="location-outline" label="City" value={c.city} />}
        {!!c.address && <InfoRow icon="home-outline" label="Address" value={c.address} />}
        {!!c.notes && <InfoRow icon="document-text-outline" label="Notes" value={c.notes} />}
        <InfoRow icon="calendar-outline" label="Client since" value={since} />
      </Card>
      <Btn kind="ghost" icon="create-outline" label="Edit client" onPress={() => setEdit(true)} />

      <SectionTitle>{`Licenses (${lics.length}${lics.length ? ` · ${active} active` : ""})`}</SectionTitle>
      {lics.length === 0 && <Text style={{ color: C.sub }}>No licenses yet for this client.</Text>}
      {lics.map((l) => <LicenseRow key={l.id} lic={l} client={c} showClient={false} today={today} onPress={() => router.push(`/license/${l.id}`)} />)}

      <ClientForm visible={edit} client={c} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); load(); }} />
    </Page>
  );
}
