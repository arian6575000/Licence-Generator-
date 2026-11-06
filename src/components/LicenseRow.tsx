import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Pill } from "./ui";
import { daysLeft, licStatus, LicStatus, STATUS_LABEL } from "../lib/status";
import type { ClientRec, LicenseRec } from "../lib/types";
import { C, T } from "../theme";

export const statusTone = { active: "ok", expiring: "warn", expired: "bad", blocked: "bad", suspended: "bad" } as const;

export function expiryText(l: LicenseRec, today: string): string {
  const left = daysLeft(l, today);
  if (left === null) return "Lifetime";
  if (left < 0) return `Expired ${-left} day${-left === 1 ? "" : "s"} ago`;
  if (left === 0) return "Expires today";
  return `Expires in ${left} day${left === 1 ? "" : "s"} · ${l.expiryDate}`;
}

export const SYNC_TEXT = { pending: "Waiting to sync", synced: "Synced", rejected: "Rejected by Hub", conflict: "Conflict", legacy: "Old record" } as const;
export const SYNC_TONE = { pending: "warn", synced: "ok", rejected: "bad", conflict: "bad", legacy: "mute" } as const;
export const SyncPill = ({ state }: { state: LicenseRec["syncState"] }) => <Pill text={SYNC_TEXT[state]} tone={SYNC_TONE[state]} />;

export default function LicenseRow({ lic, client, today, onPress, showClient = true }: { lic: LicenseRec; client?: ClientRec; today: string; onPress: () => void; showClient?: boolean }) {
  const st: LicStatus = licStatus(lic, today);
  const name = client?.clientName ?? lic.payload?.client_name ?? "Client";
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: C.text, fontSize: T.body }} numberOfLines={1}>{showClient ? name : lic.projectName}</Text>
          <Text style={{ color: C.sub, fontSize: T.small + 1 }} numberOfLines={1}>{showClient ? `${lic.projectName}${lic.planName ? ` · ${lic.planName}` : ""}` : (lic.planName || "License")}</Text>
        </View>
        <Pill text={STATUS_LABEL[st]} tone={statusTone[st]} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
        <Ionicons name="time-outline" size={15} color={C.sub} />
        <Text style={{ color: C.sub, fontSize: T.small + 1, flex: 1 }}>{expiryText(lic, today)}</Text>
        {lic.syncState !== "synced" && <SyncPill state={lic.syncState} />}
      </View>
    </Card>
  );
}
