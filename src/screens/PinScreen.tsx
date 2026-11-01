import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Field, s } from "../components/ui";
import { isValidPin } from "../lib/pin";
import { useApp } from "../state";
import { C } from "../theme";

export function PinSetup() {
  const app = useApp();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState("");
  async function save() {
    if (!isValidPin(a)) return setErr("PIN 4 se 8 digits ka hona chahiye");
    if (a !== b) return setErr("Dono PIN barabar nahi");
    try {
      await app.setupPin(a);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  return (
    <View style={[s.page, { padding: 24, gap: 14, justifyContent: "center" }]}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.text }}>App lock PIN banayen</Text>
      <Text style={s.sub}>Signing keys is phone par hain, isliye app PIN ke peeche rahegi. Yeh PIN Hub ko nahi bheja jata.</Text>
      <Field label="Naya PIN (4-8 digits)" value={a} onChangeText={setA} keyboardType="number-pad" secureTextEntry maxLength={8} />
      <Field label="PIN dobara" value={b} onChangeText={setB} keyboardType="number-pad" secureTextEntry maxLength={8} error={err} />
      <Btn label="PIN set karein" onPress={save} />
    </View>
  );
}

export function PinUnlock() {
  const app = useApp();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (app.biometric) app.tryBiometric();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function go(p: string) {
    const r = await app.unlock(p);
    if (!r.ok) {
      setMsg(r.message);
      setPin("");
    }
  }
  return (
    <View style={[s.page, { padding: 24, gap: 14, justifyContent: "center" }]}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.text }}>License Generator</Text>
      <Text style={s.sub}>PIN likhein</Text>
      <Field
        label="PIN" value={pin} onChangeText={(t) => { setPin(t); setMsg(""); }}
        keyboardType="number-pad" secureTextEntry maxLength={8} error={msg} onSubmitEditing={() => go(pin)}
      />
      <Btn label="Kholein" onPress={() => go(pin)} disabled={pin.length < 4} />
      {app.biometric && (
        <Pressable onPress={() => app.tryBiometric()} style={{ alignItems: "center", padding: 8 }}>
          <Text style={{ color: C.primary, fontWeight: "600" }}>Fingerprint / face se kholein</Text>
        </Pressable>
      )}
    </View>
  );
}
