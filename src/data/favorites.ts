// Saved stations live on the phone, keyed by station id and stamped when saved, so an account
// added later can merge two devices without rewriting what is already stored here.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const FAVORITES_STORAGE_KEY = "favorites.v1";

export interface FavoriteRecord {
  stationId: string;
  /** ISO timestamp of when the station was saved. */
  savedAt: string;
}

/** Junk entries are dropped; when the same station appears twice, the newest record wins. */
export function parseStoredFavorites(raw: string | null): FavoriteRecord[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const byStation: Record<string, FavoriteRecord> = {};
  for (const entry of parsed) {
    if (entry == null || typeof entry !== "object") continue;
    const { stationId, savedAt } = entry as Partial<FavoriteRecord>;
    if (typeof stationId !== "string" || stationId === "") continue;
    if (typeof savedAt !== "string" || savedAt === "") continue;
    const seen = byStation[stationId];
    if (!seen || savedAt > seen.savedAt) byStation[stationId] = { stationId, savedAt };
  }
  return Object.values(byStation);
}

/** Saving a station that is already saved removes it, and everything else keeps its place. */
export function toggleFavorite(favorites: FavoriteRecord[], stationId: string, savedAt: Date): FavoriteRecord[] {
  const remaining = favorites.filter((favorite) => favorite.stationId !== stationId);
  if (remaining.length !== favorites.length) return remaining;
  return [...favorites, { stationId, savedAt: savedAt.toISOString() }];
}

export async function loadFavorites(): Promise<FavoriteRecord[]> {
  return parseStoredFavorites(await AsyncStorage.getItem(FAVORITES_STORAGE_KEY));
}

export async function saveFavorites(favorites: FavoriteRecord[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}
