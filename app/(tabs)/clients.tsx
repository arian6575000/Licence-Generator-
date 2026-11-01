import { useCallback, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import ClientForm from "../../src/components/ClientForm";
import LicenseCard, { SyncPill } from "../../src/components/LicenseCard";
import { Btn, Card, Field, Pill, s } from "../../src/components/ui";
import { discardProblem, retryProblem } from "../../src/lib/sync";
import type { ClientRec, LicenseRec } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { C } from "../../src/theme";

const today = () => new Date().toISOString().slice(0, 10);

export default function Clients() {
  const app = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ClientRec[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState<{ open: boolean; client: ClientRec | null }>({ open: false, client: null });
  const [detail, setDetail] = useState<ClientRec | null>(null);
  const [lics, setLics] = useState<LicenseRec[]>([]);

  const load = useCallback(async () => {
    const [cs, all] = await Promise.all([app.repo.clients(q), app.repo.licenses()]);
    setRows(cs);
    const m: Record<string, number> = {};
    all.forEach((l) => (m[l.clientId] = (m[l.clientId] ?? 0) + 1));
    setCounts(m);
    if (detail) {
      const fresh = await app.repo.client(detail.id);
      setDetail(fresh ?? null);
      setLics(await app.repo.licenses({ clientId: detail.id }));
    }
  }, [app.repo, q, detail]);

  useFocusEffect(useCallback(() => { load(); }, [load, app.version])); // eslint-disable-line react-hooks/exhaustive-deps

  async function open(c: ClientRec) {
    setDetail(c);
    setLics(await app.repo.licenses({ clientId: c.id }));
  }

  return (
    <View style={s.page}>
      <View style={{ flexDirection: "row", gap: 8, padding: 12 }}>
        <View style={{ flex: 1 }}><Field label="Search" value={q} onChangeText={setQ} placeholder="Naam, business, phone, shehar" /></View>
        <View style={{ justifyContent: "flex-end" }}><Btn label="+ Naya" onPress={() => setForm({ open: true, client: null })} /></View>
      </View>
      <Text style={{ paddingHorizontal: 12, color: C.sub }}>{rows.length} clients</Text>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item: c }) => (
          <Pressable onPress={() => open(c)}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: C.text, flex: 1 }}>{c.clientName}</Text>
                <SyncPill state={c.syncState} />
              </View>
              <Text style={s.sub}>{c.businessName} · {c.phone}{c.city ? ` · ${c.city}` : ""}</Text>
              <Text style={s.sub}>{counts[c.id] ?? 0} licenses</Text>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: C.sub, marginTop: 40 }}>Abhi koi client nahi. "+ Naya" dabayen.</Text>}
      />

      <ClientForm
        visible={form.open} client={form.client} onClose={() => setForm({ open: false, client: null })}
        onSaved={(c) => { setForm({ open: false, client: null }); if (detail) setDetail(c); load(); }}
      />

      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        {detail && (
          <ScrollView style={s.page} contentContainerStyle={{ padding: 16, gap: 12 }}>
            <Text style={s.title}>{detail.clientName}</Text>
            <Card>
              <Text style={{ color: C.text }}>{detail.businessName}</Text>
              <Text style={s.sub}>Phone: {detail.phone}{detail.whatsapp && detail.whatsapp !== detail.phone ? ` · WhatsApp: ${detail.whatsapp}` : ""}</Text>
              {!!detail.email && <Text style={s.sub}>{detail.email}</Text>}
              {!!(detail.city || detail.address) && <Text style={s.sub}>{[detail.city, detail.address].filter(Boolean).join(", ")}</Text>}
              {!!detail.notes && <Text style={s.sub}>{detail.notes}</Text>}
              <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                <SyncPill state={detail.syncState} />
                {detail.status !== "active" && <Pill text={detail.status} tone="warn" />}
              </View>
              {!!detail.syncMessage && <Text style={{ color: C.danger }}>{detail.syncMessage}</Text>}
            </Card>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Btn label="Edit" kind="ghost" onPress={() => setForm({ open: true, client: detail })} />
              <Btn label="Is ke liye license banayen" onPress={() => { const id = detail.id; setDetail(null); router.push({ pathname: "/", params: { clientId: id } }); }} />
              {(detail.syncState === "rejected" || detail.syncState === "conflict") && (
                <Btn label="Dobara bhejein" kind="ghost" onPress={async () => { await retryProblem(app.repo, "client", detail.id); app.afterChange(); }} />
              )}
              {["rejected", "conflict", "legacy"].includes(detail.syncState) && lics.length === 0 && (
                <Btn
                  label="Hata dein" kind="danger"
                  onPress={() => Alert.alert("Hata dein?", "Yeh client sirf is phone se hatay ga (Hub par nahi tha).", [
                    { text: "Nahi" },
                    { text: "Haan", style: "destructive", onPress: async () => { await discardProblem(app.repo, "client", detail.id); setDetail(null); app.afterChange(); } },
                  ])}
                />
              )}
            </View>
            <Text style={s.label}>Licenses ({lics.length})</Text>
            {lics.map((l) => <LicenseCard key={l.id} lic={l} client={detail} today={today()} />)}
            <Btn label="Band karein" kind="ghost" onPress={() => setDetail(null)} />
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}
