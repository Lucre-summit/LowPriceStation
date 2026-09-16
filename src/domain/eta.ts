// Travel time is estimated from straight-line distance until a routing provider is wired in.
// The estimate exists so that a station's time-of-use window is judged against when the driver
// would actually arrive, rather than against the moment they opened the app.

/** Average speed while crawling across a city, in km/h. */
export const CITY_SPEED_KMH = 25;

/** Average speed once the drive leaves the city, in km/h. */
export const HIGHWAY_SPEED_KMH = 80;

/** The distance the city crawl is assumed to cover before open-road driving begins. */
const CITY_RADIUS_KM = 10;

/**
 * Whole minutes of driving for a straight-line distance. The first stretch is priced at city
 * speed and the rest at open-road speed, because the app now lists stations hours away and a
 * single city speed would put a 70 km station nearly three hours out.
 */
export function travelMinutes(distanceKm: number, speedKmh?: number): number {
  if (speedKmh != null) return Math.round((distanceKm / speedKmh) * 60);
  const cityKm = Math.min(distanceKm, CITY_RADIUS_KM);
  const openRoadKm = Math.max(0, distanceKm - CITY_RADIUS_KM);
  return Math.round((cityKm / CITY_SPEED_KMH) * 60 + (openRoadKm / HIGHWAY_SPEED_KMH) * 60);
}

/** When the driver would reach a station that far away, leaving at `departure`. */
export function estimateArrival(departure: Date, distanceKm: number, speedKmh?: number): Date {
  return new Date(departure.getTime() + travelMinutes(distanceKm, speedKmh) * 60_000);
}
