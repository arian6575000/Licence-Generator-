import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Banner, Card, Page, Pill } from "../src/components/ui";
import { buildProjectList } from "../src/lib/catalogView";
import type { Catalog } from "../src/lib/types";
import { useApp } from "../src/state";
import { vault } from "../src/native/secure";
import { C, T } from "../src/theme";

export default function Projects() {
  const app = useApp();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [keyed, setKeyed] = useState<Record<string, boolean>>({});
  const [anyKey, setAnyKey] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      const c = await app.repo.catalog();
      setCat(c);
      const m: Record<string, boolean> = {};
      for (const p of buildProjectList(c)) m[p.code] = !!(await vault.get(`key:${p.code}`));
      setKeyed(m);
      setAnyKey(!!(await vault.get("key:__default__")));
    })();
  }, [app.repo, app.version])); // eslint-disable-line react-hooks/exhaustive-deps

  const list = cat ? buildProjectList(cat) : [];
  return (
    <Page>
      <Banner tone="info" text="Each app’s signing key is downloaded from the Hub once and kept in this phone’s secure storage. License creation never contacts the server." />
      {list.map((p) => {
        const has = keyed[p.code] || anyKey;
        return (
          <Card key={p.code}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: C.text, fontSize: T.body }}>{p.name}</Text>
                <Text style={{ color: C.sub, fontSize: T.small + 1 }}>{p.code}{p.version ? ` · v${p.version}` : ""}</Text>
              </View>
              <Pill text={has ? "Key on this phone" : "Key missing"} tone={has ? "ok" : "bad"} />
            </View>
          </Card>
        );
      })}
      {list.length === 0 && <Text style={{ color: C.sub }}>No apps yet. Sign in and sync to load them.</Text>}
    </Page>
  );
}
