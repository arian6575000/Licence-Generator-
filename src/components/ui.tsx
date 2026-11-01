import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { C } from "../theme";

export function Btn({ label, onPress, kind = "primary", disabled, busy, style }: {
  label: string; onPress: () => void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean; busy?: boolean; style?: ViewStyle;
}) {
  const bg = kind === "primary" ? C.primary : kind === "danger" ? C.danger : "transparent";
  const fg = kind === "ghost" ? C.primary : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={[s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : 1, borderWidth: kind === "ghost" ? 1 : 0, borderColor: C.primary }, style]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={on ? { color: "#fff" } : { color: C.text }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#94A3B8" {...p} style={[s.input, error ? { borderColor: C.danger } : null, p.style]} />
      {!!error && <Text style={{ color: C.danger, fontSize: 12 }}>{error}</Text>}
    </View>
  );
}

export function Pill({ text, tone }: { text: string; tone: "ok" | "warn" | "bad" | "info" | "mute" }) {
  const map = {
    ok: [C.okBg, C.ok], warn: [C.warnBg, C.warn], bad: [C.dangerBg, C.danger], info: [C.infoBg, C.primary], mute: ["#E2E8F0", C.sub],
  } as const;
  return (
    <View style={{ backgroundColor: map[tone][0], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
      <Text style={{ color: map[tone][1], fontSize: 11, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Banner({ text, tone = "warn" }: { text: string; tone?: "warn" | "bad" | "info" }) {
  const bg = tone === "bad" ? C.dangerBg : tone === "info" ? C.infoBg : C.warnBg;
  const fg = tone === "bad" ? C.danger : tone === "info" ? C.primary : C.warn;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 10, padding: 12 }}>
      <Text style={{ color: fg }}>{text}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  label: { fontWeight: "600", color: C.text },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 16, color: C.text },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  btn: { padding: 13, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, gap: 4 },
  mono: { fontFamily: "monospace", fontSize: 11, color: C.text },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  sub: { color: C.sub },
});
