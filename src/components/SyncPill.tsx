// Header sync button: shows the state in plain words; tap = sync now (or sign in when signed out).
import { ActivityIndicator, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "../state";
import { C } from "../theme";

export default function SyncButton() {
  const app = useApp();
  const router = useRouter();
  const { sync, guard, session } = app;
  let label = "Synced";
  let color: string = C.ok;
  let icon: keyof typeof Ionicons.glyphMap = "cloud-done-outline";
  if (sync.running) { label = "Syncing…"; color = C.primary; }
  else if (!guard.ok) { label = "Action needed"; color = C.danger; icon = "alert-circle-outline"; }
  else if (!session) { label = "Offline mode"; color = C.sub; icon = "cloud-offline-outline"; }
  else if (sync.problems > 0) { label = "Needs attention"; color = C.danger; icon = "alert-circle-outline"; }
  else if (sync.pending > 0) { label = `${sync.pending} to sync`; color = C.warn; icon = "cloud-upload-outline"; }
  return (
    <Pressable onPress={() => (session ? app.runSync() : router.push("/login"))} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, minHeight: 44 }}>
      {sync.running ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name={icon} size={20} color={color} />}
      <Text style={{ color, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
