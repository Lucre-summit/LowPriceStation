import type { RankedStation } from "../../domain/rank";

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Roughly a kilometre of air, so a single result is a map rather than a speck. */
const SINGLE_POINT_SPAN_DEGREES = 0.01;

/** The box that covers every station on screen, or null when there is nothing to show. */
export function boundsOf(entries: RankedStation[]): MapBounds | null {
  if (entries.length === 0) return null;
  const lats = entries.map((entry) => entry.station.position.lat);
  const lngs = entries.map((entry) => entry.station.position.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    minLat: minLat === maxLat ? minLat - SINGLE_POINT_SPAN_DEGREES : minLat,
    maxLat: minLat === maxLat ? maxLat + SINGLE_POINT_SPAN_DEGREES : maxLat,
    minLng: minLng === maxLng ? minLng - SINGLE_POINT_SPAN_DEGREES : minLng,
    maxLng: minLng === maxLng ? maxLng + SINGLE_POINT_SPAN_DEGREES : maxLng,
  };
}
