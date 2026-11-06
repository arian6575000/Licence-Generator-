import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Field, s } from "../components/ui";
import { isValidPin } from "../lib/pin";
import { useApp } from "../state";
import { COMPANY_CREDIT } from "../lib/config";
import { C } from "../theme";

export function PinSetup() {
  const app = useApp();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState("");
  async function save() {
    if (!isValidPin(a)) return setErr("PIN must be 4 to 8 digits");
    if (a !== b) return setErr("The two PINs do not match");
    try {
      await app.setupPin(a);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  return (
    <View style={[s.page, { padding: 24, gap: 14, justifyContent: "center" }]}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.text }}>Create an app lock PIN</Text>
      <Text style={s.sub}>The signing keys live on this phone, so the app is protected by a PIN. The PIN never leaves this phone.</Text>
      <Field label="New PIN (4 to 8 digits)" value={a} onChangeText={setA} keyboardType="number-pad" secureTextEntry maxLength={8} />
      <Field label="Repeat PIN" value={b} onChangeText={setB} keyboardType="number-pad" secureTextEntry maxLength={8} error={err} />
      <Btn label="Set PIN" onPress={save} />
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
      <Text style={s.sub}>Enter your PIN</Text>
      <Field
        label="PIN" value={pin} onChangeText={(t) => { setPin(t); setMsg(""); }}
        keyboardType="number-pad" secureTextEntry maxLength={8} error={msg} onSubmitEditing={() => go(pin)}
      />
      <Btn label="Unlock" onPress={() => go(pin)} disabled={pin.length < 4} />
      {app.biometric && (
        <Pressable onPress={() => app.tryBiometric()} style={{ alignItems: "center", padding: 8 }}>
          <Text style={{ color: C.primary, fontWeight: "600" }}>Unlock with fingerprint / face</Text>
        </Pressable>
      )}
      <Text style={{ textAlign: "center", color: C.faint, fontSize: 12, marginTop: 24 }}>{COMPANY_CREDIT}</Text>
    </View>
  );
}
