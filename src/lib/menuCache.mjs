export const MENU_CACHE_KEY = "smartrest_menu_snapshot_v1";
export const MENU_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isValidSnapshot(snapshot, now = Date.now()) {
  return Boolean(
    snapshot &&
      snapshot.version === 1 &&
      (snapshot.profile === null || typeof snapshot.profile === "object") &&
      Array.isArray(snapshot.sections) &&
      Array.isArray(snapshot.offers) &&
      Array.isArray(snapshot.categories) &&
      Number.isFinite(snapshot.savedAt) &&
      now - snapshot.savedAt <= MENU_CACHE_MAX_AGE_MS &&
      now - snapshot.savedAt >= 0,
  );
}

export async function readMenuCache(storage, now = Date.now()) {
  try {
    const raw = await storage.getItem(MENU_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidSnapshot(parsed, now)) return null;
    const { version: _version, ...snapshot } = parsed;
    return snapshot;
  } catch {
    return null;
  }
}

export async function writeMenuCache(storage, snapshot) {
  if (!snapshot || !Array.isArray(snapshot.sections) || !Array.isArray(snapshot.offers) || !Array.isArray(snapshot.categories)) {
    return;
  }
  const savedAt = Number.isFinite(snapshot.savedAt) ? snapshot.savedAt : Date.now();
  await storage.setItem(MENU_CACHE_KEY, JSON.stringify({ version: 1, ...snapshot, savedAt }));
}
