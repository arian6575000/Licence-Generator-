import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { generateKeyPair, publicKeyFromSecret } from "../src/lib/licenseCore";
import { deleteKeys, loadKeys, saveKeys } from "../src/lib/keys";
import { shareText } from "../src/lib/share";
import type { KeyPair } from "../src/lib/types";
import { C } from "../src/theme";

export default function Keys() {
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [importText, setImportText] = useState("");

  useFocusEffect(useCallback(() => { loadKeys().then(setKeys); }, []));

  async function create() {
    const make = async () => {
      const kp = generateKeyPair();
      await saveKeys(kp);
      setKeys(kp);
    };
    if (!keys) return make();
    Alert.alert(
      "Purani key replace hogi",
      "Is se pehle ke saare licenses nayi public key se verify nahi honge. Pehle backup lein. Jari rakhein?",
      [{ text: "Cancel", style: "cancel" }, { text: "Replace", style: "destructive", onPress: make }]
    );
  }

  async function importKey() {
    try {
      const sk = importText.trim();
      const pk = publicKeyFromSecret(sk); // throws if invalid
      await saveKeys({ publicKey: pk, secretKey: sk });
      setKeys({ publicKey: pk, secretKey: sk });
      setImportText("");
    } catch {
      Alert.alert("Error", "Private key sahi nahi hai");
    }
  }

  async function remove() {
    Alert.alert("Key delete?", "Backup ke baghair delete karne par key wapas nahi aayegi.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteKeys(); setKeys(null); } },
    ]);
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={s.card}>
        <Text style={s.h}>Public key (client apps mein lagayen)</Text>
        <Text selectable style={s.mono}>{keys?.publicKey ?? "— maujood nahi —"}</Text>
        {keys && (
          <Pressable style={s.link} onPress={() => shareText(keys.publicKey)}>
            <Text style={{ color: C.primary }}>Copy / Share public key</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={s.btn} onPress={create}>
        <Text style={s.btnText}>{keys ? "Naya key pair banayen" : "Key pair banayen"}</Text>
      </Pressable>

      {keys && (
        <View style={[s.card, { borderColor: C.danger }]}>
          <Text style={[s.h, { color: C.danger }]}>Private key backup</Text>
          <Text style={{ color: C.sub }}>
            Yeh key kisi ko na dein aur client apps mein kabhi na lagayen. Backup kisi mehfooz jagah rakhein
            (password manager). Yeh kho gayi to purani public key ke licenses nahi ban sakenge.
          </Text>
          <Pressable style={s.link} onPress={() => shareText(keys.secretKey)}>
            <Text style={{ color: C.danger }}>Private key export (Copy / Share)</Text>
          </Pressable>
        </View>
      )}

      <View style={s.card}>
        <Text style={s.h}>Private key import (restore)</Text>
        <TextInput
          style={s.input}
          value={importText}
          onChangeText={setImportText}
          placeholder="Backup wali private key paste karein"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <Pressable style={s.link} onPress={importKey}><Text style={{ color: C.primary }}>Import</Text></Pressable>
      </View>

      {keys && (
        <Pressable style={s.link} onPress={remove}><Text style={{ color: C.danger }}>Key delete karein</Text></Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, gap: 6 },
  h: { fontWeight: "700", color: C.text },
  mono: { fontFamily: "monospace", fontSize: 12, color: C.text },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, minHeight: 60 },
  btn: { backgroundColor: C.primary, padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { paddingVertical: 6 },
});
