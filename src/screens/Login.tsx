import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Banner, Btn, Field, s } from "../components/ui";
import { DEFAULT_HUB_URL } from "../lib/config";
import { useApp } from "../state";
import { C } from "../theme";

export default function Login() {
  const app = useApp();
  const [url, setUrl] = useState(DEFAULT_HUB_URL);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("Mera Android");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await app.login({ baseUrl: url, username: user, password: pass, deviceName: name.trim() || "Android" });
    } catch (e: any) {
      Alert.alert("Login nahi hua", e?.detail ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 26, fontWeight: "800", color: C.text }}>License Generator</Text>
        <Text style={s.sub}>RetailX License Hub mein login karein. Pehli dafa internet chahiye; uske baad app offline bhi chalti hai.</Text>
        <Field label="Hub URL" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Field label="Username" value={user} onChangeText={setUser} autoCapitalize="none" autoCorrect={false} />
        <Field label="Password" value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" />
        <Field label="Is phone ka naam (Hub mein dikhega)" value={name} onChangeText={setName} />
        <Btn label="Login" onPress={go} busy={busy} disabled={!url.trim() || !user.trim() || !pass} />
        <View style={{ height: 4 }} />
        <Banner tone="info" text="Signing keys Hub se aati hain aur sirf is phone ki secure storage mein rehti hain." />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
