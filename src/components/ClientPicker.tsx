import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import ClientForm from "./ClientForm";
import { Btn, Field, s } from "./ui";
import type { ClientRec } from "../lib/types";
import { useApp } from "../state";
import { C } from "../theme";

export default function ClientPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (c: ClientRec) => void }) {
  const app = useApp();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ClientRec[]>([]);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (visible) app.repo.clients(q).then(setRows);
  }, [visible, q, app.version, app.repo]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.page, { padding: 12, gap: 10 }]}>
        <Text style={s.title}>Client chunein</Text>
        <Field label="Search" value={q} onChangeText={setQ} placeholder="Naam, business, phone, shehar" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Btn label="+ Naya client" onPress={() => setForm(true)} style={{ flex: 1 }} />
          <Btn label="Band karein" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
        </View>
        <FlatList
          data={rows}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 40 }}
          renderItem={({ item: c }) => (
            <Pressable onPress={() => onPick(c)} style={s.card}>
              <Text style={{ fontWeight: "700", color: C.text }}>{c.clientName}</Text>
              <Text style={s.sub}>{c.businessName} · {c.phone}{c.city ? ` · ${c.city}` : ""}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={{ textAlign: "center", color: C.sub, marginTop: 30 }}>Koi client nahi mila. "+ Naya client" dabayen.</Text>}
        />
      </View>
      <ClientForm visible={form} onClose={() => setForm(false)} onSaved={(c) => { setForm(false); onPick(c); }} />
    </Modal>
  );
}
