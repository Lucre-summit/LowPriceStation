import { estimateArrival } from "./eta";
import { distanceKm } from "./geo";
import { energyToAddKwh, priceForConnector, type PriceForConnector } from "./price";
import { UNATTRIBUTED, type LatLng, type NetworkTariff, type Station, type TariffsDocument, type VehicleProfile } from "./types";

/** A price checked longer ago than this is shown as possibly out of date. */
export const STALE_AFTER_DAYS = 90;

export interface RankedStation {
  station: Station;
  distanceKm: number;
  /** When the driver is expected to reach this station, which is what decides its time-of-use window. */
  arrival: Date;
  /** The cheapest compatible connector, or null when nothing prices this station. */
  price: PriceForConnector | null;
  /** When the network's rate was last checked by hand, or null when the network has no tariff. */
  checkedAt: string | null;
  stalePrice: boolean;
}

export interface RankOptions {
  origin: LatLng;
  /** When the driver sets off; each station's arrival follows from its own distance. */
  departure: Date;
  /** Today's date; separate from departure so staleness is judged by when the app is used. */
  now?: Date;
  radiusKm: number;
  minPowerKw: number;
  network: string | null;
  sort: "cheapest" | "nearest";
  energyOverrideKwh?: number | null;
}

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const toMidnight = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toMidnight - from) / 86_400_000);
}

/** True when the candidate beats the current best on cost, falling back to charging power. */
function beats(candidate: PriceForConnector, current: PriceForConnector): boolean {
  const cost = candidate.sessionCostThb;
  const bestCost = current.sessionCostThb;
  if (cost == null) return false;
  if (bestCost == null) return true;
  if (cost !== bestCost) return cost < bestCost;
  return candidate.connector.maxPowerKw > current.connector.maxPowerKw;
}

/** Ordering for the cheapest-first list: unknown prices last, then distance as the tie-break. */
function cheaperLeft(a: RankedStation, b: RankedStation): boolean {
  const costA = a.price?.sessionCostThb ?? null;
  const costB = b.price?.sessionCostThb ?? null;
  if (costA == null && costB == null) return a.distanceKm < b.distanceKm;
  if (costA == null) return false;
  if (costB == null) return true;
  if (costA !== costB) return costA < costB;
  return (a.price?.connector.maxPowerKw ?? 0) > (b.price?.connector.maxPowerKw ?? 0);
}

/**
 * The stations a driver can actually use, within radius, filtered and ordered.
 * Each station is priced at the time the driver would reach it, so a station that falls on the
 * far side of a time-of-use boundary is priced for that arrival, not for the moment of departure.
 * Stations with no price never outrank a known price, and are never given a guessed number.
 */
export function rankStations(
  stations: Station[],
  tariffs: TariffsDocument,
  profile: VehicleProfile,
  options: RankOptions,
): RankedStation[] {
  const tariffByNetwork: Record<string, NetworkTariff | undefined> = {};
  for (const tariff of tariffs.networks) tariffByNetwork[tariff.network] = tariff;
  const energyKwh = energyToAddKwh(profile, options.energyOverrideKwh ?? null);
  const now = options.now ?? new Date();

  const ranked: RankedStation[] = [];
  for (const station of stations) {
    if (options.network && station.network !== options.network) continue;
    const distance = distanceKm(options.origin, station.position);
    if (distance > options.radiusKm) continue;

    const usable = station.connectors.filter(
      (connector) =>
        connector.standard === profile.connectorStandard && connector.maxPowerKw >= options.minPowerKw,
    );
    if (usable.length === 0) continue;

    const arrival = estimateArrival(options.departure, distance);
    const tariff = tariffByNetwork[station.network];
    let best: PriceForConnector | null = null;
    if (tariff) {
      for (const connector of usable) {
        const priced = priceForConnector(connector, tariff, arrival, energyKwh);
        if (priced && (best == null || beats(priced, best))) best = priced;
      }
    }

    const checkedAt = tariff?.checkedAt ?? null;
    ranked.push({
      station,
      distanceKm: distance,
      arrival,
      price: best,
      checkedAt,
      stalePrice: checkedAt != null && daysBetween(checkedAt, now) > STALE_AFTER_DAYS,
    });
  }

  ranked.sort((a, b) => {
    if (options.sort === "nearest") return a.distanceKm - b.distanceKm;
    if (cheaperLeft(a, b)) return -1;
    if (cheaperLeft(b, a)) return 1;
    return a.distanceKm - b.distanceKm;
  });
  return ranked;
}

/** The network names present in the data, for the network filter. */
export function networkNames(stations: Station[]): string[] {
  const names = new Set(stations.map((station) => station.network));
  names.delete(UNATTRIBUTED);
  return [...names].sort();
}
