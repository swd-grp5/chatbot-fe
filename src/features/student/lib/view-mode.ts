import { migrateStorageKey, storageKey } from "@/shared/lib/storage-keys";

const KEY = storageKey("view-mode");
const VIEW_MODE_CHANGED_EVENT = storageKey("view-mode-changed");

export type ViewMode = "admin" | "lecturer" | "student";

export function getViewMode(): ViewMode | null {
  if (typeof window === "undefined") return null;
  migrateStorageKey(KEY, "sdn-view-mode");
  const raw = localStorage.getItem(KEY);
  return raw === "admin" || raw === "lecturer" || raw === "student" ? raw : null;
}

export function setViewMode(mode: ViewMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, mode);
  window.dispatchEvent(new CustomEvent(VIEW_MODE_CHANGED_EVENT));
}

export function clearViewMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(VIEW_MODE_CHANGED_EVENT));
}

export function resetViewModeForRole(role: ViewMode) {
  setViewMode(role);
}
