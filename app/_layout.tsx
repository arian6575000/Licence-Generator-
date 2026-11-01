import "../src/lib/rng";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { AppProvider, useApp } from "../src/state";
import Login from "../src/screens/Login";
import { PinSetup, PinUnlock } from "../src/screens/PinScreen";
import { C } from "../src/theme";

function Gate() {
  const a = useApp();
  if (!a.ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}><ActivityIndicator color={C.primary} /></View>;
  if (a.hasPin && a.locked) return <PinUnlock />;
  if (!a.session) return <Login />;
  if (!a.hasPin) return <PinSetup />;
  return <Slot />;
}

export default function Layout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Gate />
    </AppProvider>
  );
}
