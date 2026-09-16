// Travel time is estimated from straight-line distance until a routing provider is wired in.
// The estimate exists so that a station's time-of-use window is judged against when the driver
// would actually arrive, rather than against the moment they opened the app.

/** Average speed for Bangkok-area driving, in km/h. */
export const AVERAGE_CITY_SPEED_KMH = 25;

/** Whole minutes of driving for a straight-line distance. */
export function travelMinutes(distanceKm: number, speedKmh: number = AVERAGE_CITY_SPEED_KMH): number {
  return Math.round((distanceKm / speedKmh) * 60);
}

/** When the driver would reach a station that far away, leaving at `departure`. */
export function estimateArrival(
  departure: Date,
  distanceKm: number,
  speedKmh: number = AVERAGE_CITY_SPEED_KMH,
): Date {
  return new Date(departure.getTime() + travelMinutes(distanceKm, speedKmh) * 60_000);
}
