import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { FeatureMap, featureLabel, groupFeatures } from "../lib/catalog";
import { C } from "../theme";

type Props = { features: FeatureMap; onChange: (f: FeatureMap) => void };

export default function FeatureEditor({ features, onChange }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState("");
  const groups = useMemo(() => groupFeatures(features), [features]);
  const total = Object.values(features).filter((v) => v === true).length;

  const set = (k: string, v: boolean | string | number) => onChange({ ...features, [k]: v });
  const setMany = (keys: string[], v: boolean) => {
    const next = { ...features };
    keys.forEach((k) => { if (typeof next[k] === "boolean") next[k] = v; });
    onChange(next);
  };
  const addCustom = () => {
    const k = newKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!k) return;
    set(k, true);
    setNewKey("");
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.sub }}>{total} features on, {Object.keys(features).length} total</Text>
      {groups.map((g) => {
        const bools = g.keys.filter((k) => typeof features[k] === "boolean");
        const on = bools.filter((k) => features[k] === true).length;
        const isOpen = !!open[g.module];
        return (
          <View key={g.module} style={s.group}>
            <Pressable style={s.head} onPress={() => setOpen({ ...open, [g.module]: !isOpen })}>
              <Text style={{ fontWeight: "700", flex: 1, color: C.text }}>{g.label}</Text>
              <Text style={{ color: C.sub }}>{on}/{bools.length} {isOpen ? "▲" : "▼"}</Text>
            </Pressable>
            {isOpen && (
              <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
                <View style={{ flexDirection: "row", gap: 16, paddingVertical: 6 }}>
                  <Pressable onPress={() => setMany(g.keys, true)}><Text style={{ color: C.primary }}>Sab on</Text></Pressable>
                  <Pressable onPress={() => setMany(g.keys, false)}><Text style={{ color: C.danger }}>Sab off</Text></Pressable>
                </View>
                {g.keys.map((k) => {
                  const v = features[k];
                  const m = featureLabel(k);
                  return (
                    <View key={k} style={s.row}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ color: C.text }}>{m.label}</Text>
                        <Text style={{ color: C.sub, fontSize: 11 }}>{k}</Text>
                      </View>
                      {typeof v === "boolean" ? (
                        <Switch value={v} onValueChange={(x) => set(k, x)} />
                      ) : (
                        <TextInput
                          style={[s.input, { width: 100 }]}
                          value={String(v)}
                          onChangeText={(t) => set(k, typeof v === "number" ? Number(t) || 0 : t)}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={newKey}
          onChangeText={setNewKey}
          placeholder="Naya custom feature key (e.g. premium)"
          autoCapitalize="none"
        />
        <Pressable style={s.add} onPress={addCustom}><Text style={{ color: "#fff", fontWeight: "700" }}>Add</Text></Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  group: { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  head: { flexDirection: "row", padding: 12, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, fontSize: 14 },
  add: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
});
