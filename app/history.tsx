import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { listRecords } from "../src/lib/history";
import { shareText } from "../src/lib/share";
import type { LicenseRecord } from "../src/lib/types";
import { C } from "../src/theme";

const d = (t: number) => new Date(t * 1000).toLocaleDateString();

export default function History() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LicenseRecord[]>([]);

  const load = useCallback((search: string) => listRecords(search).then(setRows), []);
  useFocusEffect(useCallback(() => { load(q); }, [load, q]));

  async function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = ["id,app,device_id,name,issued,expires"].concat(
      rows.map((r) =>
        [r.id, r.app, r.deviceId, r.name, d(r.issuedAt), r.expiresAt ? d(r.expiresAt) : "lifetime"].map(esc).join(",")
      )
    );
    await shareText(lines.join("\n"));
  }

  const now = Date.now() / 1000;

  return (
    <View style={s.page}>
      <View style={{ flexDirection: "row", gap: 8, padding: 12 }}>
        <TextInput style={[s.input, { flex: 1 }]} value={q} onChangeText={setQ} placeholder="Search: app, name, device ID" />
        <Pressable style={s.btn} onPress={exportCsv}><Text style={{ color: "#fff" }}>CSV</Text></Pressable>
      </View>
      <Text style={{ paddingHorizontal: 12, color: C.sub }}>{rows.length} licenses</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item: r }) => {
          const expired = r.expiresAt !== 0 && r.expiresAt < now;
          return (
            <View style={s.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700" }}>{r.name}</Text>
                <Text style={{ color: expired ? C.danger : C.ok }}>
                  {r.expiresAt === 0 ? "Lifetime" : expired ? "Expired" : `Till ${d(r.expiresAt)}`}
                </Text>
              </View>
              <Text style={{ color: C.sub }}>{r.app} · {r.deviceId}</Text>
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
  card: { backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, gap: 2 },
});
