// Turns the read-only Hub catalog into what the Generate screen needs.
// Hub projects win; the built-in list only fills gaps (e.g. apps the Hub does not know yet).
import { DEFAULT_PROJECTS, FeatureMap, PLANS, Project } from "./catalog";
import type { Catalog, HubPlan } from "./types";

export type ProjectView = Project & { source: "hub" | "builtin"; version?: string };
export type PlanView = {
  key: string;
  name: string;
  description: string;
  maxUsers: number;
  features: FeatureMap;
  validityDays?: number;
  isLifetime?: boolean;
};

export function buildProjectList(cat: Catalog): ProjectView[] {
  const out: ProjectView[] = [];
  const seen = new Set<string>();
  for (const hp of cat.projects) {
    const base = DEFAULT_PROJECTS.find((p) => p.code === hp.code);
    const feats = Object.keys(hp.defaultFeatures ?? {}).length ? hp.defaultFeatures : base?.features ?? {};
    out.push({
      code: hp.code,
      name: hp.name || base?.name || hp.code,
      platform: hp.platform || base?.platform || "other",
      idFormat: base?.idFormat ?? "any",
      legacy: base?.legacy ?? false,
      plans: base?.plans ?? [],
      planName: base?.planName ?? "standard",
      features: feats,
      maxUsers: base?.maxUsers ?? 1,
      source: "hub",
      version: hp.currentVersion,
    });
    seen.add(hp.code);
  }
  for (const p of DEFAULT_PROJECTS) if (!seen.has(p.code)) out.push({ ...p, source: "builtin" });
  return out;
}

export function plansFor(project: ProjectView, cat: Catalog): PlanView[] {
  const hubPlans = cat.plans.filter((p: HubPlan) => p.projectCode === project.code);
  if (hubPlans.length) {
    return hubPlans.map((p) => ({
      key: p.tierCode,
      name: p.name,
      description: p.description,
      maxUsers: p.maxUsers,
      features: p.features,
      validityDays: p.validityDays,
      isLifetime: p.isLifetime,
    }));
  }
  return project.plans
    .filter((k) => PLANS[k])
    .map((k) => ({ key: k, name: PLANS[k].name, description: PLANS[k].description, maxUsers: PLANS[k].max_users, features: PLANS[k].features }));
}

export function projectName(code: string, cat: Catalog): string {
  return cat.projects.find((p) => p.code === code)?.name ?? DEFAULT_PROJECTS.find((p) => p.code === code)?.name ?? code;
}
