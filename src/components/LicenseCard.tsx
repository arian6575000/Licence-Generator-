import { useState } from "react";
import { Alert, Text, View } from "react-native";
import ExpiryPicker, { useExpiry } from "./ExpiryPicker";
import { Btn, Card, Pill, s } from "./ui";
import { renewLicense } from "../lib/generate";
import { shareText } from "../lib/share";
import { discardProblem, retryProblem } from "../lib/sync";
import { daysLeft, licStatus, STATUS_LABEL } from "../lib/status";
import type { ClientRec, LicenseRec } from "../lib/types";
import { useApp } from "../state";
import { C } from "../theme";

const toneOf = { active: "ok", expiring: "warn", expired: "bad", blocked: "bad", suspended: "bad" } as const;
const SYNC_TEXT = { pending: "Hub par bhejna baaqi", synced: "Hub par hai", rejected: "Hub ne radd kiya", conflict: "Conflict", legacy: "Purana record" } as const;
const SYNC_TONE = { pending: "warn", synced: "ok", rejected: "bad", conflict: "bad", legacy: "mute" } as const;

export function SyncPill({ state }: { state: LicenseRec["syncState"] }) {
  return <Pill text={SYNC_TEXT[state]} tone={SYNC_TONE[state]} />;
}

export default function LicenseCard({ lic, client, today }: { lic: LicenseRec; client?: ClientRec; today: string }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [renew, setRenew] = useState(false);
  const [busy, setBusy] = useState(false);
  const exp = useExpiry("365");
  const st = licStatus(lic, today);
  const left = daysLeft(lic, today);
  const on = Object.values(lic.features ?? {}).filter((v) => v === true).length;

  async function doRenew() {
    setBusy(true);
    try {
      await renewLicense(app.deps, lic.id, exp.choice());
      setRenew(false);
      app.afterChange();
    } catch (e: any) {
      Alert.alert("Renew nahi hua", e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "700", color: C.text, flex: 1 }}>{client?.clientName ?? lic.payload?.client_name ?? "Client"}</Text>
        <Pill text={STATUS_LABEL[st]} tone={toneOf[st]} />
      </View>
      <Text style={s.sub}>{lic.projectName} · {lic.planName || "-"} · {lic.maxUsers} users · {on} features</Text>
      <Text style={s.sub}>{lic.machineId}</Text>
      <Text style={s.sub}>
        {lic.isLifetime ? "Lifetime" : `Expiry ${lic.expiryDate}${left !== null ? (left >= 0 ? ` (${left} din baaqi)` : ` (${-left} din pehle)`) : ""}`}
      </Text>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
        <SyncPill state={lic.syncState} />
        {lic.origin === "server" && <Pill text="Hub ne banayi" tone="info" />}
      </View>
      {!!lic.blockReason && st === "blocked" && <Text style={{ color: C.danger }}>Wajah: {lic.blockReason}</Text>}
      {!!lic.syncMessage && <Text style={{ color: C.danger }}>{lic.syncMessage}</Text>}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <Btn label={open ? "Key chhupayen" : "Key dikhayen"} kind="ghost" onPress={() => setOpen(!open)} style={{ paddingVertical: 8 }} />
        <Btn label="Copy / Share" kind="ghost" onPress={() => shareText(lic.license)} style={{ paddingVertical: 8 }} />
        {st !== "blocked" && st !== "suspended" && lic.syncState !== "legacy" && (
          <Btn label="Renew" onPress={() => setRenew(!renew)} style={{ paddingVertical: 8 }} />
        )}
        {(lic.syncState === "rejected" || lic.syncState === "conflict") && (
          <>
            <Btn label="Dobara bhejein" kind="ghost" onPress={async () => { await retryProblem(app.repo, "license", lic.id); app.afterChange(); }} style={{ paddingVertical: 8 }} />
            <Btn
              label="Hata dein" kind="danger" style={{ paddingVertical: 8 }}
              onPress={() => Alert.alert("Hata dein?", "Yeh license sirf is phone se hatay gi (Hub ne qabool hi nahi ki thi).", [
                { text: "Nahi" },
                { text: "Haan, hata dein", style: "destructive", onPress: async () => { await discardProblem(app.repo, "license", lic.id); app.afterChange(); } },
              ])}
            />
          </>
        )}
      </View>
      {open && <Text selectable style={[s.mono, { marginTop: 6 }]}>{lic.license}</Text>}
      {renew && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <ExpiryPicker {...exp} />
          <Btn label="Naya key banayen" onPress={doRenew} busy={busy} />
        </View>
      )}
    </Card>
  );
}
