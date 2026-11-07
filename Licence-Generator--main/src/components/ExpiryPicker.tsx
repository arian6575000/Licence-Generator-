import { useState } from "react";
import { Text, View } from "react-native";
import { Chip, Field, s } from "./ui";
import { isoDate } from "../lib/licenseCore";
import type { ExpiryChoice } from "../lib/generate";
import { C } from "../theme";

export type Mode = "7" | "30" | "90" | "180" | "365" | "lifetime" | "custom";
const PRESETS: { id: Mode; label: string }[] = [
  { id: "7", label: "7 days" }, { id: "30", label: "30 days" }, { id: "90", label: "90 days" },
  { id: "180", label: "6 months" }, { id: "365", label: "1 year" }, { id: "lifetime", label: "Lifetime" }, { id: "custom", label: "Custom date" },
];

export function choiceFrom(mode: Mode, customDate: string): ExpiryChoice {
  return mode === "lifetime" ? "lifetime" : mode === "custom" ? { date: customDate.trim() } : { days: parseInt(mode, 10) };
}

/** "2026-12-06" for a preset, "Lifetime", or "" while a custom date is incomplete. */
export function expiryPreview(mode: Mode, customDate: string, now = Date.now()): string {
  if (mode === "lifetime") return "Lifetime";
  if (mode === "custom") return /^\d{4}-\d{2}-\d{2}$/.test(customDate.trim()) ? customDate.trim() : "";
  return isoDate(new Date(now + parseInt(mode, 10) * 86400000));
}

export default function ExpiryPicker({ mode, setMode, date, setDate }: { mode: Mode; setMode: (m: Mode) => void; date: string; setDate: (d: string) => void }) {
  const preview = expiryPreview(mode, date);
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        {PRESETS.map((p) => <Chip key={p.id} label={p.label} on={mode === p.id} onPress={() => setMode(p.id)} />)}
      </View>
      {mode === "custom" && (
        <Field label="Expiry date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
      )}
      <Text style={{ color: C.sub }}>{preview ? (mode === "lifetime" ? "This license never expires." : `Valid until ${preview}`) : "Enter the date as YYYY-MM-DD"}</Text>
    </View>
  );
}

export function useExpiry(initial: Mode = "30") {
  const [mode, setMode] = useState<Mode>(initial);
  const [date, setDate] = useState("");
  return { mode, setMode, date, setDate, choice: () => choiceFrom(mode, date) };
}
