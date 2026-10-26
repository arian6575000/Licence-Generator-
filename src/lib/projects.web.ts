import { DEFAULT_PROJECTS, Project } from "./catalog";

const K = "mpos_projects_v1";

export async function loadProjects(): Promise<Project[]> {
  try {
    const s = localStorage.getItem(K);
    if (s) return JSON.parse(s) as Project[];
  } catch {}
  return DEFAULT_PROJECTS;
}
export async function saveProjects(list: Project[]) {
  localStorage.setItem(K, JSON.stringify(list));
}
export async function resetProjects() {
  localStorage.removeItem(K);
}
