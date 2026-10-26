import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import FeatureEditor from "../src/components/FeatureEditor";
import { DEFAULT_PROJECTS, Project } from "../src/lib/catalog";
import { loadProjects, resetProjects, saveProjects } from "../src/lib/projects";
import { C } from "../src/theme";

const blank = (): Project => ({
  code: "", name: "", platform: "mobile", idFormat: "hex20", legacy: false,
  plans: [], planName: "standard", features: {}, maxUsers: 1,
});

export default function Projects() {
  const [list, setList] = useState<Project[]>([]);
  const [edit, setEdit] = useState<{ p: Project; isNew: boolean } | null>(null);

  useFocusEffect(useCallback(() => { loadProjects().then(setList); }, []));

  async function persist(next: Project[]) {
    setList(next);
    await saveProjects(next);
  }

  async function save() {
    if (!edit) return;
    const p = { ...edit.p, code: edit.p.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"), name: edit.p.name.trim() };
    if (!p.code || !p.name) return Alert.alert("Error", "Name aur code dono zaroori hain");
    if (edit.isNew && list.some((x) => x.code === p.code)) return Alert.alert("Error", "Yeh code pehle se maujood hai");
    await persist(edit.isNew ? [...list, p] : list.map((x) => (x.code === p.code ? p : x)));
    setEdit(null);
  }

  function remove(p: Project) {
    Alert.alert("Project delete?", `${p.name} list se hata diya jayega (purani history rahegi).`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { persist(list.filter((x) => x.code !== p.code)); setEdit(null); } },
    ]);
  }

  function reset() {
    Alert.alert("Defaults wapas?", "Saare projects ki tabdeeliyan khatam ho jayengi.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => { await resetProjects(); setList(DEFAULT_PROJECTS); setEdit(null); } },
    ]);
  }

  if (edit) {
    const p = edit.p;
    const set = (patch: Partial<Project>) => setEdit({ ...edit, p: { ...p, ...patch } });
    return (
      <ScrollView style={s.page} contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Project name</Text>
        <TextInput style={s.input} value={p.name} onChangeText={(t) => set({ name: t })} placeholder="My App" />
        <Text style={s.label}>Project code (licenses mein sign hota hai, baad mein na badlein)</Text>
        <TextInput style={[s.input, !edit.isNew && { opacity: 0.6 }]} editable={edit.isNew} value={p.code} onChangeText={(t) => set({ code: t })} autoCapitalize="none" placeholder="my_app" />
        <Text style={s.label}>Device ID ka format</Text>
        <View style={s.row}>
          {(["hex20", "any"] as const).map((f) => (
            <Pressable key={f} onPress={() => set({ idFormat: f })} style={[s.chip, p.idFormat === f && s.chipOn]}>
              <Text style={p.idFormat === f ? { color: "#fff" } : undefined}>{f === "hex20" ? "XXXX-XXXX-XXXX-XXXX-XXXX" : "Koi bhi ID (RetailX)"}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.label}>License format</Text>
        <View style={s.row}>
          {[true, false].map((l) => (
            <Pressable key={String(l)} onPress={() => set({ legacy: l })} style={[s.chip, p.legacy === l && s.chipOn]}>
              <Text style={p.legacy === l ? { color: "#fff" } : undefined}>{l ? "RetailX jaisa (bina project code)" : "Project code ke saath"}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.label}>Default plan name</Text>
        <TextInput style={s.input} value={p.planName} onChangeText={(t) => set({ planName: t })} autoCapitalize="none" />
        <Text style={s.label}>Default max users</Text>
        <TextInput style={s.input} value={String(p.maxUsers)} onChangeText={(t) => set({ maxUsers: parseInt(t, 10) || 1 })} keyboardType="number-pad" />
        <Text style={s.label}>Default features</Text>
        <FeatureEditor features={p.features} onChange={(f) => set({ features: f })} />
        <Pressable style={s.btn} onPress={save}><Text style={s.btnText}>Save</Text></Pressable>
        <Pressable style={s.link} onPress={() => setEdit(null)}><Text style={{ color: C.sub }}>Cancel</Text></Pressable>
        {!edit.isNew && <Pressable style={s.link} onPress={() => remove(p)}><Text style={{ color: C.danger }}>Project delete karein</Text></Pressable>}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, gap: 10 }}>
      {list.map((p) => (
        <Pressable key={p.code} style={s.card} onPress={() => setEdit({ p: { ...p, features: { ...p.features } }, isNew: false })}>
          <Text style={{ fontWeight: "700", color: C.text }}>{p.name}</Text>
          <Text style={{ color: C.sub }}>
            {p.code} · {p.legacy ? "RetailX format" : "project code ke saath"} · {Object.keys(p.features).length} features
          </Text>
        </Pressable>
      ))}
      <Pressable style={s.btn} onPress={() => setEdit({ p: blank(), isNew: true })}><Text style={s.btnText}>Naya project</Text></Pressable>
      <Pressable style={s.link} onPress={reset}><Text style={{ color: C.danger }}>Defaults wapas karein</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  label: { fontWeight: "600", color: C.text },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border, gap: 2 },
  btn: { backgroundColor: C.primary, padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { paddingVertical: 8, alignItems: "center" },
});
