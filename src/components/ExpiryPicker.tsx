import { useState } from "react";
import { Text, View } from "react-native";
import { Chip, Field, s } from "./ui";
import { isoDate } from "../lib/licenseCore";
import type { ExpiryChoice } from "../lib/generate";

export type Mode = "7" | "30" | "90" | "180" | "365" | "lifetime" | "custom";
const PRESETS: { id: Mode; label: string }[] = [
  { id: "7", label: "7 din" }, { id: "30", label: "30 din" }, { id: "90", label: "90 din" },
  { id: "180", label: "180 din" }, { id: "365", label: "1 saal" }, { id: "lifetime", label: "Lifetime" },
  { id: "custom", label: "Custom date" },
];

export function choiceFrom(mode: Mode, customDate: string): ExpiryChoice {
  return mode === "lifetime" ? "lifetime" : mode === "custom" ? { date: customDate.trim() } : { days: parseInt(mode, 10) };
}

export default function ExpiryPicker({ mode, setMode, date, setDate }: { mode: Mode; setMode: (m: Mode) => void; date: string; setDate: (d: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>Muddat</Text>
      <View style={s.row}>
        {PRESETS.map((p) => <Chip key={p.id} label={p.label} on={mode === p.id} onPress={() => setMode(p.id)} />)}
      </View>
      {mode === "custom" && (
        <Field label="Expiry date" value={date} onChangeText={setDate} placeholder={`YYYY-MM-DD (e.g. ${isoDate(new Date(Date.now() + 90 * 86400000))})`} />
      )}
    </View>
  );
}

export function useExpiry(initial: Mode = "30") {
  const [mode, setMode] = useState<Mode>(initial);
  const [date, setDate] = useState("");
  return { mode, setMode, date, setDate, choice: () => choiceFrom(mode, date) };
}
