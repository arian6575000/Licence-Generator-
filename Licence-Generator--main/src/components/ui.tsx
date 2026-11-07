// Shared UI kit. Flat cards with borders (no elevation, so no stray shadow boxes on Android).
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R, SP, T } from "../theme";

type IconName = keyof typeof Ionicons.glyphMap;

// ---------- Buttons ----------
export function Btn({ label, onPress, kind = "primary", disabled, busy, style, icon, small }: {
  label: string; onPress: () => void; kind?: "primary" | "soft" | "ghost" | "danger"; disabled?: boolean; busy?: boolean;
  style?: StyleProp<ViewStyle>; icon?: IconName; small?: boolean;
}) {
  const palette = {
    primary: { bg: C.primary, fg: "#fff", bd: C.primary },
    soft: { bg: C.primarySoft, fg: C.primary, bd: C.primarySoft },
    ghost: { bg: "#fff", fg: C.primary, bd: C.border },
    danger: { bg: "#fff", fg: C.danger, bd: C.dangerSoft },
  }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      android_ripple={{ color: "rgba(0,0,0,0.08)" }}
      style={({ pressed }) => [
        s.btn, small && { minHeight: 40, paddingHorizontal: SP.md },
        { backgroundColor: pressed && kind === "primary" ? C.primaryDark : palette.bg, borderColor: palette.bd, opacity: disabled ? 0.45 : 1 }, style,
      ]}
    >
      {busy ? <ActivityIndicator color={palette.fg} /> : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} />}
          <Text style={{ color: palette.fg, fontWeight: "700", fontSize: small ? 14 : T.body }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, label, tone = "primary" }: { icon: IconName; onPress: () => void; label: string; tone?: "primary" | "ok" }) {
  const fg = tone === "ok" ? C.ok : C.primary;
  const bg = tone === "ok" ? C.okSoft : C.primarySoft;
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true }} style={[s.iconBtn, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={fg} />
    </Pressable>
  );
}

// Big action tile (Call / WhatsApp / New license ...)
export function Action({ icon, label, onPress, tone = "primary", disabled }: { icon: IconName; label: string; onPress: () => void; tone?: "primary" | "ok"; disabled?: boolean }) {
  const fg = tone === "ok" ? C.ok : C.primary;
  const bg = tone === "ok" ? C.okSoft : C.primarySoft;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ flex: 1, alignItems: "center", gap: 6, opacity: disabled ? 0.4 : 1 }}>
      <View style={[s.actionCircle, { backgroundColor: bg }]}><Ionicons name={icon} size={22} color={fg} /></View>
      <Text style={{ color: C.text, fontSize: T.small, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      {icon && <Ionicons name={icon} size={14} color={on ? "#fff" : C.sub} />}
      <Text style={{ color: on ? "#fff" : C.text, fontWeight: "600", fontSize: T.small }}>{label}</Text>
    </Pressable>
  );
}

// ---------- Inputs ----------
export function Field({ label, error, hint, right, ...p }: TextInputProps & { label?: string; error?: string; hint?: string; right?: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          placeholderTextColor={C.faint}
          {...p}
          style={[s.input, { flex: 1 }, p.multiline && { minHeight: 80, textAlignVertical: "top" }, error ? { borderColor: C.danger } : null, p.style]}
        />
        {right}
      </View>
      {error ? <Text style={{ color: C.danger, fontSize: T.small }}>{error}</Text> : hint ? <Text style={{ color: C.sub, fontSize: T.small }}>{hint}</Text> : null}
    </View>
  );
}

// ---------- Display ----------
export function Pill({ text, tone }: { text: string; tone: "ok" | "warn" | "bad" | "info" | "mute" }) {
  const map = {
    ok: [C.okSoft, C.ok], warn: [C.warnSoft, C.warn], bad: [C.dangerSoft, C.danger], info: [C.infoSoft, C.primary], mute: [C.muteSoft, C.sub],
  } as const;
  return (
    <View style={{ backgroundColor: map[tone][0], paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill }}>
      <Text style={{ color: map[tone][1], fontSize: 12, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) return <Pressable onPress={onPress} android_ripple={{ color: "rgba(37,71,208,0.08)" }} style={({ pressed }) => [s.card, pressed && { backgroundColor: "#F7F9FF" }, style]}>{children}</Pressable>;
  return <View style={[s.card, style]}>{children}</View>;
}

export function Banner({ text, tone = "warn", action }: { text: string; tone?: "warn" | "bad" | "info" | "ok"; action?: { label: string; onPress: () => void } }) {
  const m = { warn: [C.warnSoft, C.warn], bad: [C.dangerSoft, C.danger], info: [C.infoSoft, C.primary], ok: [C.okSoft, C.ok] }[tone];
  return (
    <View style={{ backgroundColor: m[0], borderRadius: R.md, padding: SP.md, gap: 6 }}>
      <Text style={{ color: m[1], fontSize: T.small + 1, lineHeight: 19 }}>{text}</Text>
      {action && <Pressable onPress={action.onPress}><Text style={{ color: m[1], fontWeight: "800" }}>{action.label}</Text></Pressable>}
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: C.primary, fontWeight: "800", fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SP.sm }}>
      <Text style={{ fontSize: T.h3, fontWeight: "800", color: C.text }}>{children}</Text>
      {right}
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ alignItems: "center", padding: SP.xl, gap: 8 }}>
      <View style={[s.actionCircle, { width: 64, height: 64, borderRadius: 32 }]}><Ionicons name={icon} size={30} color={C.primary} /></View>
      <Text style={{ fontSize: T.h3, fontWeight: "800", color: C.text }}>{title}</Text>
      <Text style={{ color: C.sub, textAlign: "center", lineHeight: 20 }}>{text}</Text>
      {action && <Btn label={action.label} onPress={action.onPress} style={{ marginTop: 8 }} />}
    </View>
  );
}

// key: value line used on profile / detail screens
export function InfoRow({ icon, label, value, onPress, selectable }: { icon: IconName; label: string; value: string; onPress?: () => void; selectable?: boolean }) {
  const body = (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 }}>
      <Ionicons name={icon} size={20} color={C.sub} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.sub, fontSize: 12 }}>{label}</Text>
        <Text selectable={selectable} style={{ color: onPress ? C.primary : C.text, fontSize: T.body }}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={C.faint} />}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }} />;

// Standard scrolling page
export function Page({ children, pad = true }: { children: ReactNode; pad?: boolean }) {
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: pad ? SP.lg : 0, gap: SP.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  label: { fontWeight: "700", color: C.text, fontSize: T.small + 1 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, minHeight: 48 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, minHeight: 38, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, justifyContent: "center" },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  btn: { minHeight: 48, paddingHorizontal: SP.lg, borderRadius: R.md, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  actionCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: SP.lg, borderWidth: 1, borderColor: C.border, gap: 4 },
  mono: { fontFamily: "monospace", fontSize: 11, color: C.text },
  title: { fontSize: T.h2, fontWeight: "800", color: C.text },
  sub: { color: C.sub, fontSize: T.small + 1 },
});
