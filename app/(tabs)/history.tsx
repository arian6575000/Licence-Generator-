import { useCallback, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import LicenseCard from "../../src/components/LicenseCard";
import { Btn, Chip, Field, s } from "../../src/components/ui";
import { buildProjectList } from "../../src/lib/catalogView";
import { shareText } from "../../src/lib/share";
import { licStatus, LicStatus, STATUS_LABEL } from "../../src/lib/status";
import type { Catalog, ClientRec, LicenseRec } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { C } from "../../src/theme";

type StatusFilter = "all" | LicStatus | "problem";
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Sab" }, { id: "active", label: STATUS_LABEL.active }, { id: "expiring", label: STATUS_LABEL.expiring },
  { id: "expired", label: STATUS_LABEL.expired }, { id: "blocked", label: "Blocked" }, { id: "problem", label: "Sync masail" },
];
const d = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

export default function Licenses() {
  const app = useApp();
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<LicenseRec[]>([]);
  const [clients, setClients] = useState<Map<string, ClientRec>>(new Map());
  const [cat, setCat] = useState<Catalog | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const [l, c, k] = await Promise.all([app.repo.licenses({ search: q, projectCode: proj }), app.repo.clients("", true), app.repo.catalog()]);
    setRows(l);
    setClients(new Map(c.map((x) => [x.id, x])));
    setCat(k);
  }, [app.repo, q, proj]);
  useFocusEffect(useCallback(() => { load(); }, [load, app.version])); // eslint-disable-line react-hooks/exhaustive-deps

  const projects = useMemo(() => (cat ? buildProjectList(cat) : []), [cat]);
  const shown = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "problem") return r.syncState === "rejected" || r.syncState === "conflict";
    if (filter === "blocked") return ["blocked", "suspended"].includes(licStatus(r, today));
    return licStatus(r, today) === filter;
  });

  async function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = ["id,project,client,business,phone,machine_id,plan,max_users,issued,expires,status,sync"].concat(
      shown.map((r) => {
        const c = clients.get(r.clientId);
        return [r.id, r.projectName, c?.clientName ?? "", c?.businessName ?? "", c?.phone ?? "", r.machineId, r.planName, r.maxUsers, d(r.issuedAt),
          r.isLifetime ? "lifetime" : r.expiryDate, licStatus(r, today), r.syncState].map(esc).join(",");
      })
    );
    await shareText(lines.join("\n"));
  }

  return (
    <View style={s.page}>
      <View style={{ flexDirection: "row", gap: 8, padding: 12 }}>
        <View style={{ flex: 1 }}><Field label="Search" value={q} onChangeText={setQ} placeholder="Client, machine ID, phone" /></View>
        <View style={{ justifyContent: "flex-end" }}><Btn label="CSV" onPress={exportCsv} /></View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12 }}>
        {[{ code: "", name: "Sab projects" }, ...projects].map((p) => <Chip key={p.code} label={p.name} on={proj === p.code} onPress={() => setProj(p.code)} />)}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 12, paddingBottom: 0 }}>
        {FILTERS.map((f) => <Chip key={f.id} label={f.label} on={filter === f.id} onPress={() => setFilter(f.id)} />)}
      </View>
      <Text style={{ paddingHorizontal: 12, paddingTop: 8, color: C.sub }}>{shown.length} licenses</Text>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item: r }) => <LicenseCard lic={r} client={clients.get(r.clientId)} today={today} />}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: C.sub, marginTop: 40 }}>Abhi koi license nahi</Text>}
      />
    </View>
  );
}
