const KEY = "sdn-view-mode";

export type ViewMode = "admin" | "lecturer" | "student";

export function getViewMode(): ViewMode | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw === "admin" || raw === "lecturer" || raw === "student" ? raw : null;
}

export function setViewMode(mode: ViewMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, mode);
  window.dispatchEvent(new CustomEvent("sdn-view-mode-changed"));
}

export function clearViewMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("sdn-view-mode-changed"));
}

export function resetViewModeForRole(role: ViewMode) {
  setViewMode(role);
}
