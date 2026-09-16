import type { RankedStation } from "../../domain/rank";
import type { LatLng } from "../../domain/types";

export interface StationMapProps {
  /** Exactly the list the driver is looking at, in the same order. */
  entries: RankedStation[];
  /** Where the driver is, which the map opens around. */
  origin: LatLng;
  /** Opens a station's detail screen. */
  onSelect: (entry: RankedStation) => void;
}

/**
 * Raster tiles straight from OpenStreetMap: no key, no account, and the same source on both
 * platforms. It is a development-grade source — the OSM tile policy gives no SLA and discourages
 * heavy commercial use — so a hosted provider replaces this URL, not this component, before the
 * app is published.
 */
export const TILE_URL_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION = "© OpenStreetMap contributors";
