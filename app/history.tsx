import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { listRecords } from "../src/lib/history";
import { loadProjects } from "../src/lib/projects";
import { shareText } from "../src/lib/share";
import type { Project } from "../src/lib/catalog";
import type { LicenseRecord } from "../src/lib/types";
import { C } from "../src/theme";

const d = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

export default function History() {
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<LicenseRecord[]>([]);

  const load = useCallback(() => listRecords(q, proj).then(setRows), [q, proj]);
  useFocusEffect(useCallback(() => { loadProjects().then(setProjects); load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  async function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = ["id,project,client,phone,machine_id,plan,max_users,issued,expires"].concat(
      rows.map((r) =>
        [r.id, r.projectName, r.clientName, r.phone, r.machineId, r.planName, r.maxUsers, d(r.issuedAt), r.isLifetime ? "lifetime" : r.expiryDate].map(esc).join(",")
      )
    );
    await shareText(lines.join("\n"));
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <View style={s.page}>
      <View style={{ flexDirection: "row", gap: 8, padding: 12 }}>
        <TextInput style={[s.input, { flex: 1 }]} value={q} onChangeText={setQ} placeholder="Search: client, machine ID, phone" />
        <Pressable style={s.btn} onPress={exportCsv}><Text style={{ color: "#fff" }}>CSV</Text></Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12 }}>
        {[{ code: "", name: "Sab" } as any, ...projects].map((p) => (
          <Pressable key={p.code} onPress={() => setProj(p.code)} style={[s.chip, proj === p.code && s.chipOn]}>
            <Text style={proj === p.code ? { color: "#fff", fontSize: 12 } : { fontSize: 12 }}>{p.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ paddingHorizontal: 12, paddingTop: 8, color: C.sub }}>{rows.length} licenses</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item: r }) => {
          const expired = !r.isLifetime && r.expiryDate < today;
          const on = Object.values(r.payload?.features ?? {}).filter((v) => v === true).length;
          return (
            <View style={s.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700" }}>{r.clientName}</Text>
                <Text style={{ color: expired ? C.danger : C.ok }}>
                  {r.isLifetime ? "Lifetime" : expired ? "Expired" : `Till ${r.expiryDate}`}
                </Text>
              </View>
              <Text style={{ color: C.sub }}>{r.projectName} · {r.planName} · {r.maxUsers} users · {on} features</Text>
              <Text style={{ color: C.sub }}>{r.machineId}{r.phone ? ` · ${r.phone}` : ""}</Text>
              <Text style={{ color: C.sub }}>Issued {d(r.issuedAt)} · #{r.id}</Text>
              <Pressable onPress={() => shareText(r.license)} style={{ marginTop: 6 }}>
                <Text style={{ color: C.primary }}>License dobara copy / share karein</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: C.sub, marginTop: 40 }}>Abhi koi license nahi</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10 },
  btn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, gap: 2 },
});
