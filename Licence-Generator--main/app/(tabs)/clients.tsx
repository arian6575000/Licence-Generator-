import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ClientForm from "../../src/components/ClientForm";
import { SyncPill } from "../../src/components/LicenseRow";
import { Avatar, Btn, Card, Empty, Field, s } from "../../src/components/ui";
import { openDialer, openWhatsApp } from "../../src/lib/contact";
import type { ClientRec } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { C, SP, T } from "../../src/theme";

export default function Clients() {
  const app = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ClientRec[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState(false);

  const load = useCallback(async () => {
    const [cs, all] = await Promise.all([app.repo.clients(q), app.repo.licenses()]);
    setRows(cs);
    const m: Record<string, number> = {};
    all.forEach((l) => (m[l.clientId] = (m[l.clientId] ?? 0) + 1));
    setCounts(m);
  }, [app.repo, q]);
  useFocusEffect(useCallback(() => { load(); }, [load, app.version])); // eslint-disable-line react-hooks/exhaustive-deps

  const round = (icon: keyof typeof Ionicons.glyphMap, color: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={6} android_ripple={{ color: "rgba(0,0,0,0.08)", radius: 22 }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: C.primarySoft }}>
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );

  return (
    <View style={s.page}>
      <View style={{ flexDirection: "row", gap: SP.sm, padding: SP.lg, paddingBottom: SP.sm }}>
        <View style={{ flex: 1 }}><Field placeholder="Search name, phone, city" value={q} onChangeText={setQ} /></View>
        <Btn icon="person-add" label="Add" onPress={() => setForm(true)} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: SP.lg, paddingTop: SP.sm, gap: SP.sm }}
        ListEmptyComponent={<Empty icon="people-outline" title={q ? "No match" : "No clients yet"} text={q ? "Try a different search." : "Add your first client. It works offline and syncs later."} action={q ? undefined : { label: "Add client", onPress: () => setForm(true) }} />}
        renderItem={({ item: c }) => (
          <Card onPress={() => router.push(`/client/${c.id}`)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={c.clientName} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: C.text, fontSize: T.body }} numberOfLines={1}>{c.clientName}</Text>
                <Text style={{ color: C.sub, fontSize: T.small + 1 }} numberOfLines={1}>{[c.businessName !== c.clientName ? c.businessName : "", c.phone].filter(Boolean).join(" · ")}</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 4, alignItems: "center" }}>
                  <Text style={{ color: C.sub, fontSize: T.small }}>{counts[c.id] ?? 0} license{(counts[c.id] ?? 0) === 1 ? "" : "s"}</Text>
                  {c.syncState !== "synced" && <SyncPill state={c.syncState} />}
                </View>
              </View>
              {round("call", C.primary, () => openDialer(c.phone))}
              {round("logo-whatsapp", C.ok, () => openWhatsApp(c.whatsapp || c.phone))}
            </View>
          </Card>
        )}
      />
      <ClientForm visible={form} onClose={() => setForm(false)} onSaved={(c) => { setForm(false); load(); router.push(`/client/${c.id}`); }} />
    </View>
  );
}
