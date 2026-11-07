import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from "react-native";
import { Btn, Field, s } from "./ui";
import { saveClient } from "../lib/generate";
import type { ClientRec } from "../lib/types";
import { useApp } from "../state";
import { C, SP } from "../theme";

const EMPTY = { clientName: "", businessName: "", phone: "", whatsapp: "", email: "", city: "", address: "", notes: "" };

export default function ClientForm({ visible, client, onClose, onSaved }: { visible: boolean; client?: ClientRec | null; onClose: () => void; onSaved: (c: ClientRec) => void }) {
  const app = useApp();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setF(client
      ? { clientName: client.clientName, businessName: client.businessName, phone: client.phone, whatsapp: client.whatsapp === client.phone ? "" : client.whatsapp, email: client.email, city: client.city, address: client.address, notes: client.notes }
      : EMPTY);
  }, [visible, client]);

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      const rec = await saveClient(app.repo, f, client?.id);
      app.afterChange();
      onSaved(rec);
    } catch (e: any) {
      Alert.alert("Could not save client", e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md, paddingTop: 48, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>{client ? "Edit client" : "New client"}</Text>
          <Field label="Client name *" value={f.clientName} onChangeText={set("clientName")} autoCapitalize="words" />
          <Field label="Phone *" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="0300 1234567" hint="Used for the Call and WhatsApp buttons." />
          <Field label="Business name" value={f.businessName} onChangeText={set("businessName")} placeholder="Same as client name if empty" autoCapitalize="words" />
          <Field label="WhatsApp number" value={f.whatsapp} onChangeText={set("whatsapp")} keyboardType="phone-pad" placeholder="Same as phone if empty" />
          <Field label="Email" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
          <Field label="City" value={f.city} onChangeText={set("city")} autoCapitalize="words" />
          <Field label="Address" value={f.address} onChangeText={set("address")} multiline />
          <Field label="Notes" value={f.notes} onChangeText={set("notes")} multiline />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Btn label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Btn label="Save client" onPress={save} busy={busy} disabled={!f.clientName.trim() || !f.phone.trim()} style={{ flex: 1 }} />
          </View>
          <Text style={{ color: C.sub, fontSize: 12, textAlign: "center" }}>Saved on this phone right away. It is sent to the Hub automatically when you are online.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
