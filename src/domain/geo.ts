import type { LatLng } from "./types";

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. Straight-line, which is what the radius filter uses. */
export function distanceKm(from: LatLng, to: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (to.lat - from.lat) * rad;
  const dLng = (to.lng - from.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
