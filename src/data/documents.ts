// The curated documents are fetched at launch and cached, so a price correction reaches the app
// without an app release, and the last good copy survives a dead connection.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { StationsDocument, TariffsDocument } from "../domain/types";

const BASE_URL = "https://raw.githubusercontent.com/Lucre-summit/LowPriceStation/main/data";
const STATIONS_URL = `${BASE_URL}/stations.th.json`;
const TARIFFS_URL = `${BASE_URL}/tariffs.th.json`;
const CACHE_KEY = "documents.v1";

export interface Documents {
  stations: StationsDocument;
  tariffs: TariffsDocument;
  /** When this copy was fetched from the network, ISO date. */
  fetchedAt: string;
  /** True when the app fell back to the cached copy. */
  fromCache: boolean;
}

interface CachedDocuments {
  stations: StationsDocument;
  tariffs: TariffsDocument;
  fetchedAt: string;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

function assertStationsDocument(value: unknown): StationsDocument {
  const doc = value as StationsDocument | null;
  if (!doc || !Array.isArray(doc.stations) || typeof doc.version !== "number") {
    throw new Error("stations document has an unexpected shape");
  }
  return doc;
}

function assertTariffsDocument(value: unknown): TariffsDocument {
  const doc = value as TariffsDocument | null;
  if (!doc || !Array.isArray(doc.networks) || typeof doc.version !== "number") {
    throw new Error("tariffs document has an unexpected shape");
  }
  return doc;
}

function readCache(raw: string | null): CachedDocuments | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedDocuments;
    return assertStationsDocument(parsed.stations) && assertTariffsDocument(parsed.tariffs) ? parsed : null;
  } catch {
    return null;
  }
}

/** The newest documents the app can reach: fresh from the network, else the last cached copy. */
export async function loadDocuments(): Promise<Documents> {
  const cached = readCache(await AsyncStorage.getItem(CACHE_KEY));
  try {
    const [stations, tariffs] = await Promise.all([fetchJson(STATIONS_URL), fetchJson(TARIFFS_URL)]);
    const fresh: CachedDocuments = {
      stations: assertStationsDocument(stations),
      tariffs: assertTariffsDocument(tariffs),
      fetchedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
    return { ...fresh, fromCache: false };
  } catch (error) {
    if (cached) return { ...cached, fromCache: true };
    throw error;
  }
}
