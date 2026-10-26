import "../src/lib/rng";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { C } from "../src/theme";

export default function Layout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: C.card },
          headerTitleStyle: { color: C.text },
          tabBarActiveTintColor: C.primary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Generate",
            tabBarIcon: ({ color, size }) => <Ionicons name="key-outline" color={color as string} size={size} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color as string} size={size} />,
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: "Projects",
            tabBarIcon: ({ color, size }) => <Ionicons name="apps-outline" color={color as string} size={size} />,
          }}
        />
        <Tabs.Screen
          name="keys"
          options={{
            title: "Keys",
            tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" color={color as string} size={size} />,
          }}
        />
      </Tabs>
    </>
  );
}
