import "../src/lib/rng";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { AppProvider, useApp } from "../src/state";
import Login from "../src/screens/Login";
import { PinSetup, PinUnlock } from "../src/screens/PinScreen";
import { C } from "../src/theme";

// Order: loading -> PIN unlock -> first-time sign in (only when the signing keys are not on this phone yet) -> PIN setup -> app.
// Once the keys are downloaded the app never needs the server again to create clients or licenses.
function Gate() {
  const a = useApp();
  if (!a.ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}><ActivityIndicator color={C.primary} /></View>;
  if (a.hasPin && a.locked) return <PinUnlock />;
  if (!a.hasKeys && !a.session) return <Login />;
  if (!a.hasPin) return <PinSetup />;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: C.card }, headerTitleStyle: { fontWeight: "800", color: C.text }, headerShadowVisible: false, headerTintColor: C.primary, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-license" options={{ title: "New license" }} />
      <Stack.Screen name="license/[id]" options={{ title: "License" }} />
      <Stack.Screen name="client/[id]" options={{ title: "Client" }} />
      <Stack.Screen name="projects" options={{ title: "Apps & keys" }} />
      <Stack.Screen name="login" options={{ title: "Sign in to sync" }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Gate />
    </AppProvider>
  );
}
