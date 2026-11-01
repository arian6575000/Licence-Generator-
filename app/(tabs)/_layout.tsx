import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SyncButton from "../../src/components/SyncPill";
import { C } from "../../src/theme";

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: any; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.card },
        headerTitleStyle: { color: C.text },
        tabBarActiveTintColor: C.primary,
        headerRight: () => <SyncButton />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Generate", tabBarIcon: icon("key-outline") }} />
      <Tabs.Screen name="clients" options={{ title: "Clients", tabBarIcon: icon("people-outline") }} />
      <Tabs.Screen name="history" options={{ title: "Licenses", tabBarIcon: icon("time-outline") }} />
      <Tabs.Screen name="info" options={{ title: "Hub Info", tabBarIcon: icon("apps-outline") }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: icon("settings-outline") }} />
    </Tabs>
  );
}
