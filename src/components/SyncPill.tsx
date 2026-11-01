import { ActivityIndicator, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../state";
import { C } from "../theme";

export default function SyncButton() {
  const app = useApp();
  const { sync, guard } = app;
  const bad = sync.problems > 0 || !guard.ok;
  const label = sync.running ? "Sync..." : !guard.ok ? "Sync zaroori" : sync.pending > 0 ? `${sync.pending} baaqi` : "Synced";
  return (
    <Pressable onPress={() => app.runSync()} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12 }}>
      {sync.running ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="sync" size={18} color={bad ? C.danger : sync.pending > 0 ? C.warn : C.ok} />}
      <Text style={{ color: bad ? C.danger : sync.pending > 0 ? C.warn : C.ok, fontWeight: "600", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
