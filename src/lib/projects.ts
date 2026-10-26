// Native: project list kept in the SQLite key-value store.
import Storage from "expo-sqlite/kv-store";
import { DEFAULT_PROJECTS, Project } from "./catalog";

const K = "mpos_projects_v1";

export async function loadProjects(): Promise<Project[]> {
  try {
    const s = await Storage.getItem(K);
    if (s) return JSON.parse(s) as Project[];
  } catch {}
  return DEFAULT_PROJECTS;
}
export async function saveProjects(list: Project[]) {
  await Storage.setItem(K, JSON.stringify(list));
}
export async function resetProjects() {
  await Storage.removeItem(K);
}
