import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Banner, Btn, Field, s } from "../components/ui";
import { COMPANY_CREDIT, DEFAULT_HUB_URL } from "../lib/config";
import { useApp } from "../state";
import { C, SP, T } from "../theme";

export default function Login({ embedded = false }: { embedded?: boolean }) {
  const app = useApp();
  const router = useRouter();
  const [url, setUrl] = useState(DEFAULT_HUB_URL);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("My Android phone");
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await app.login({ baseUrl: url, username: user, password: pass, deviceName: name.trim() || "Android" });
      if (embedded) router.back();
    } catch (e: any) {
      Alert.alert("Could not sign in", e?.detail ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md, paddingTop: embedded ? SP.lg : 64 }} keyboardShouldPersistTaps="handled">
        {!embedded && (
          <View style={{ alignItems: "center", gap: 6, marginBottom: SP.md }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="key" size={36} color="#fff" />
            </View>
            <Text style={{ fontSize: 26, fontWeight: "800", color: C.text }}>License Generator</Text>
          </View>
        )}
        <Text style={{ color: C.sub, fontSize: T.body }}>
          {embedded
            ? "Sign in to back up your clients and licenses to the Hub and see changes made elsewhere."
            : "Sign in once to download your signing keys. After that, the app creates licenses fully offline."}
        </Text>
        <Field label="Username" value={user} onChangeText={setUser} autoCapitalize="none" autoCorrect={false} />
        <Field label="Password" value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" onSubmitEditing={go} />
        <Btn label="Sign in" onPress={go} busy={busy} disabled={!url.trim() || !user.trim() || !pass} />
        <Pressable onPress={() => setAdvanced((v) => !v)} style={{ alignItems: "center", padding: 8 }}>
          <Text style={{ color: C.primary, fontWeight: "700" }}>{advanced ? "Hide advanced options" : "Advanced options"}</Text>
        </Pressable>
        {advanced && (
          <>
            <Field label="Hub address" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <Field label="Name of this phone (shown in the Hub)" value={name} onChangeText={setName} />
          </>
        )}
        <Banner tone="info" text="Signing keys are stored only in this phone’s secure storage and are never shown on screen." />
        <Text style={{ textAlign: "center", color: C.faint, fontSize: T.small, marginTop: SP.md }}>{COMPANY_CREDIT}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
