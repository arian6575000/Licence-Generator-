import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, ScrollView, Text, View } from "react-native";
import { Btn, Field, s } from "./ui";
import { saveClient } from "../lib/generate";
import type { ClientRec } from "../lib/types";
import { useApp } from "../state";
import { C } from "../theme";

export default function ClientForm({ visible, client, onClose, onSaved }: { visible: boolean; client?: ClientRec | null; onClose: () => void; onSaved: (c: ClientRec) => void }) {
  const app = useApp();
  const [f, setF] = useState({ clientName: "", businessName: "", phone: "", whatsapp: "", email: "", city: "", address: "", notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setF(client
      ? { clientName: client.clientName, businessName: client.businessName, phone: client.phone, whatsapp: client.whatsapp, email: client.email, city: client.city, address: client.address, notes: client.notes }
      : { clientName: "", businessName: "", phone: "", whatsapp: "", email: "", city: "", address: "", notes: "" });
  }, [visible, client]);

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      const rec = await saveClient(app.repo, f, client?.id);
      app.afterChange();
      onSaved(rec);
    } catch (e: any) {
      Alert.alert("Client save nahi hua", e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.page}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>{client ? "Client edit karein" : "Naya client"}</Text>
          <Field label="Client ka naam *" value={f.clientName} onChangeText={set("clientName")} />
          <Field label="Business / dukaan ka naam" value={f.businessName} onChangeText={set("businessName")} placeholder="Khali ho to client ka naam" />
          <Field label="Phone *" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="03xx..." />
          <Field label="WhatsApp" value={f.whatsapp} onChangeText={set("whatsapp")} keyboardType="phone-pad" placeholder="Khali ho to phone wala" />
          <Field label="Email" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Shehar" value={f.city} onChangeText={set("city")} />
          <Field label="Address" value={f.address} onChangeText={set("address")} multiline />
          <Field label="Notes" value={f.notes} onChangeText={set("notes")} multiline />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Btn label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Btn label="Save" onPress={save} busy={busy} style={{ flex: 1 }} />
          </View>
          <Text style={{ color: C.sub, fontSize: 12 }}>Client offline bhi ban jata hai; internet milte hi Hub par chala jata hai.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
