import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import ExpiryPicker, { useExpiry } from "../../src/components/ExpiryPicker";
import { expiryText, statusTone, SyncPill } from "../../src/components/LicenseRow";
import { Banner, Btn, Card, InfoRow, Page, Pill, SectionTitle } from "../../src/components/ui";
import { featureLabel } from "../../src/lib/catalog";
import { licenseMessage, openWhatsApp } from "../../src/lib/contact";
import { renewLicense } from "../../src/lib/generate";
import { shareText } from "../../src/lib/share";
import { licStatus, STATUS_LABEL } from "../../src/lib/status";
import { discardProblem, retryProblem } from "../../src/lib/sync";
import type { ClientRec, LicenseRec } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { C, T } from "../../src/theme";

export default function LicenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const router = useRouter();
  const [lic, setLic] = useState<LicenseRec | null | undefined>(undefined);
  const [client, setClient] = useState<ClientRec | undefined>();
  const [showKey, setShowKey] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const exp = useExpiry("365");
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const l = await app.repo.license(String(id));
    setLic(l ?? null);
    setClient(l ? await app.repo.client(l.clientId) : undefined);
  }, [app.repo, id]);
  useFocusEffect(useCallback(() => { load(); }, [load, app.version])); // eslint-disable-line react-hooks/exhaustive-deps

  if (lic === undefined) return <Page><Text style={{ color: C.sub }}>Loading…</Text></Page>;
  if (lic === null) return <Page><Text style={{ color: C.sub }}>This license was not found.</Text></Page>;

  const st = licStatus(lic, today);
  const name = client?.clientName ?? lic.payload?.client_name ?? "Client";
  const msg = licenseMessage(lic, name);
  const feats = Object.entries(lic.features ?? {}).filter(([, v]) => v === true).map(([k]) => featureLabel(k).label);
  const canRenew = !["blocked", "suspended"].includes(st) && lic.syncState !== "legacy";

  async function doRenew() {
    if (!lic) return;
    setBusy(true);
    try {
      const rec = await renewLicense(app.deps, lic.id, exp.choice());
      app.afterChange();
      setRenewing(false);
      setLic(rec);
      Alert.alert("License renewed", "A new key was created. Send it to the client so they can activate it.");
    } catch (e: any) {
      Alert.alert("Could not renew", e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      {st === "blocked" && <Banner tone="bad" text={`Blocked on the Hub${lic.blockReason ? `: ${lic.blockReason}` : ""}`} />}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: T.h2, fontWeight: "800", color: C.text }}>{lic.projectName}</Text>
            <Text style={{ color: C.sub }}>{lic.planName} · {lic.maxUsers} user{lic.maxUsers === 1 ? "" : "s"}</Text>
          </View>
          <Pill text={STATUS_LABEL[st]} tone={statusTone[st]} />
        </View>
        <Text style={{ color: C.text, marginTop: 8, fontWeight: "700" }}>{expiryText(lic, today)}</Text>
      </Card>

      <Btn label="Send on WhatsApp" icon="logo-whatsapp" style={{ minHeight: 54 }} onPress={async () => {
        const ok = await openWhatsApp(client?.whatsapp || client?.phone || "", msg);
        if (!ok) { Alert.alert("WhatsApp not available", "Opening the share menu instead."); shareText(msg); }
      }} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn kind="soft" icon={copied ? "checkmark" : "copy-outline"} label={copied ? "Copied" : "Copy key"} style={{ flex: 1 }} onPress={async () => {
          await Clipboard.setStringAsync(lic.license); setCopied(true); setTimeout(() => setCopied(false), 2000);
        }} />
        <Btn kind="soft" icon="share-social-outline" label="Share" style={{ flex: 1 }} onPress={() => shareText(msg)} />
      </View>
      {canRenew && !renewing && <Btn kind="ghost" icon="refresh" label="Renew license" onPress={() => setRenewing(true)} />}
      {renewing && (
        <Card style={{ gap: 10 }}>
          <Text style={{ fontWeight: "800", color: C.text }}>Renew for how long?</Text>
          <ExpiryPicker mode={exp.mode} setMode={exp.setMode} date={exp.date} setDate={exp.setDate} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn kind="ghost" label="Cancel" style={{ flex: 1 }} onPress={() => setRenewing(false)} />
            <Btn label="Renew" style={{ flex: 1 }} busy={busy} onPress={doRenew} />
          </View>
        </Card>
      )}

      <SectionTitle>Client</SectionTitle>
      <Card onPress={client ? () => router.push(`/client/${client.id}`) : undefined}>
        <Text style={{ fontWeight: "800", color: C.text }}>{name}</Text>
        {!!client && <Text style={{ color: C.sub }}>{client.phone}{client.city ? ` · ${client.city}` : ""}</Text>}
      </Card>

      <SectionTitle>Details</SectionTitle>
      <Card>
        <InfoRow icon="phone-portrait-outline" label="Device ID" value={lic.machineId} selectable />
        <InfoRow icon="calendar-outline" label="Issued" value={new Date(lic.issuedAt * 1000).toISOString().slice(0, 10)} />
        <InfoRow icon="time-outline" label="Valid until" value={lic.isLifetime ? "Lifetime" : lic.expiryDate} />
        <InfoRow icon="repeat-outline" label="Renewals" value={String(Math.max(0, lic.revision - 1))} />
      </Card>

      <SectionTitle right={<SyncPill state={lic.syncState} />}>Sync</SectionTitle>
      {lic.syncState === "pending" && <Text style={{ color: C.sub }}>Saved on this phone. It will be sent to the Hub automatically when you are online and signed in.</Text>}
      {!!lic.syncMessage && <Text style={{ color: C.danger }}>{lic.syncMessage}</Text>}
      {(lic.syncState === "rejected" || lic.syncState === "conflict") && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn kind="ghost" label="Try again" style={{ flex: 1 }} onPress={async () => { await retryProblem(app.repo, "license", lic.id); app.afterChange(); }} />
          <Btn kind="danger" label="Remove" style={{ flex: 1 }} onPress={() => Alert.alert("Remove this license?", "It was never accepted by the Hub, so it will only be removed from this phone.", [
            { text: "Cancel" },
            { text: "Remove", style: "destructive", onPress: async () => { if (await discardProblem(app.repo, "license", lic.id)) { app.afterChange(); router.back(); } } },
          ])} />
        </View>
      )}

      <SectionTitle>License key</SectionTitle>
      <Card>
        {showKey ? <Text selectable style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>{lic.license}</Text> : <Text style={{ color: C.sub }}>Hidden for safety</Text>}
        <Btn kind="ghost" small label={showKey ? "Hide key" : "Show key"} onPress={() => setShowKey((v) => !v)} style={{ marginTop: 8 }} />
      </Card>

      <SectionTitle>{feats.length} features included</SectionTitle>
      <Card>
        <Text style={{ color: C.text, lineHeight: 22 }}>{feats.length ? feats.join(" · ") : "None"}</Text>
      </Card>
    </Page>
  );
}
