import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Btn, Card, Pill, s } from "../../src/components/ui";
import { shareText } from "../../src/lib/share";
import { vault } from "../../src/native/secure";
import { featureLabel } from "../../src/lib/catalog";
import { buildProjectList, plansFor, ProjectView } from "../../src/lib/catalogView";
import type { Catalog } from "../../src/lib/types";
import { useApp } from "../../src/state";
import { C } from "../../src/theme";

// Everything here is READ-ONLY: it comes from the Hub.
export default function Info() {
  const app = useApp();
  const [cat, setCat] = useState<Catalog>({ projects: [], plans: [], releases: [], fetchedAt: 0 });
  const [open, setOpen] = useState<string>("");
  const [defaultPub, setDefaultPub] = useState("");
  useFocusEffect(useCallback(() => {
    app.repo.catalog().then(setCat);
    vault.get("key:__default__").then((r) => setDefaultPub(r ? (JSON.parse(r).publicKey as string) : ""));
  }, [app.repo, app.version])); // eslint-disable-line react-hooks/exhaustive-deps
  const projects = buildProjectList(cat);

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Banner tone="info" text={`Yeh sab Hub se aata hai aur sirf dekhne ke liye hai.${cat.fetchedAt ? ` Aakhri update: ${new Date(cat.fetchedAt).toLocaleString()}` : " Abhi sync nahi hua."}`} />

      {!!defaultPub && (
        <Card>
          <Text style={{ fontWeight: "700", color: C.text }}>Default (master) public key</Text>
          <Text selectable style={s.mono}>{defaultPub}</Text>
          <Text style={s.sub}>Un projects ke liye jin ki apni key Hub mein nahi. Public key chhupi nahi hoti, client apps mein lagti hai.</Text>
          <Btn label="Copy" kind="ghost" onPress={() => shareText(defaultPub)} style={{ paddingVertical: 8, marginTop: 4 }} />
        </Card>
      )}

      <Text style={s.title}>Projects</Text>
      {projects.map((p: ProjectView) => {
        const plans = plansFor(p, cat);
        const isOpen = open === p.code;
        const feats = Object.entries(p.features);
        return (
          <Pressable key={p.code} onPress={() => setOpen(isOpen ? "" : p.code)}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: C.text, flex: 1 }}>{p.name}</Text>
                <Pill text={p.source === "hub" ? "Hub" : "App mein built-in"} tone={p.source === "hub" ? "info" : "mute"} />
              </View>
              <Text style={s.sub}>{p.code} · {p.platform}{p.version ? ` · v${p.version}` : ""}</Text>
              <Text style={s.sub}>{plans.length} plans · {feats.filter(([, v]) => v === true).length} default features on</Text>
              {isOpen && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {!!cat.projects.find((x) => x.code === p.code)?.publicKey && (
                    <>
                      <Text style={{ fontWeight: "700", color: C.text }}>Public key</Text>
                      <Text selectable style={s.mono}>{cat.projects.find((x) => x.code === p.code)!.publicKey}</Text>
                    </>
                  )}
                  {plans.map((pl) => (
                    <Text key={pl.key} style={{ color: C.text }}>
                      <Text style={{ fontWeight: "700" }}>{pl.name}</Text> · {pl.maxUsers} users{pl.isLifetime ? " · lifetime" : pl.validityDays ? ` · ${pl.validityDays} din` : ""} · {Object.values(pl.features).filter((v) => v === true).length} features
                    </Text>
                  ))}
                  {feats.length > 0 && <Text style={{ fontWeight: "700", color: C.text, marginTop: 4 }}>Default features</Text>}
                  {feats.map(([k, v]) => (
                    <Text key={k} style={{ color: v === false ? C.sub : C.text, fontSize: 12 }}>{v === true ? "✓" : v === false ? "✗" : "•"} {featureLabel(k).label} <Text style={{ color: C.sub }}>({k}{typeof v !== "boolean" ? `: ${String(v)}` : ""})</Text></Text>
                  ))}
                </View>
              )}
            </Card>
          </Pressable>
        );
      })}

      <Text style={s.title}>Releases</Text>
      {cat.releases.length === 0 && <Text style={s.sub}>Koi release nahi (ya Hub se abhi nahi aayi).</Text>}
      {cat.releases.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "700", color: C.text }}>{r.brandId} {r.versionTag}</Text>
            <Pill text={r.isActive ? "Active" : "Band"} tone={r.isActive ? "ok" : "mute"} />
          </View>
          <Text style={s.sub}>{r.fileSizeMb ? `${r.fileSizeMb} MB · ` : ""}{r.createdAt.slice(0, 10)}</Text>
          {!!r.releaseNotes && <Text style={{ color: C.text }}>{r.releaseNotes}</Text>}
          {!!r.downloadUrl && (
            <Pressable onPress={() => Linking.openURL(r.downloadUrl).catch(() => {})}>
              <Text style={{ color: C.primary }}>Download link kholein</Text>
            </Pressable>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}
