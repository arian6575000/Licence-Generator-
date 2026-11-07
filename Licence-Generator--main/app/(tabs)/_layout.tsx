import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SyncButton from "../../src/components/SyncPill";
import { C } from "../../src/theme";

const icon = (name: keyof typeof Ionicons.glyphMap, focused: keyof typeof Ionicons.glyphMap) =>
  ({ color, size, focused: f }: { color: any; size: number; focused: boolean }) => <Ionicons name={f ? focused : name} color={color} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.card }, headerTitleStyle: { fontWeight: "800", color: C.text }, headerShadowVisible: false,
        headerRight: () => <SyncButton />,
        tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: C.faint,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: C.border, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline", "home") }} />
      <Tabs.Screen name="clients" options={{ title: "Clients", tabBarIcon: icon("people-outline", "people") }} />
      <Tabs.Screen name="history" options={{ title: "Licenses", tabBarIcon: icon("key-outline", "key") }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: icon("settings-outline", "settings") }} />
    </Tabs>
  );
}
