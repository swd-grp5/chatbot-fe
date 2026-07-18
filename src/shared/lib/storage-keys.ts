const PREFIX = "chatbox";

export function storageKey(suffix: string) {
  return `${PREFIX}-${suffix}`;
}

export function migrateStorageKey(nextKey: string, legacyKey: string) {
  if (typeof window === "undefined") return;
  try {
    const legacy = localStorage.getItem(legacyKey);
    if (legacy == null) return;
    if (localStorage.getItem(nextKey) == null) {
      localStorage.setItem(nextKey, legacy);
    }
    localStorage.removeItem(legacyKey);
  } catch {
    // ignore
  }
}
