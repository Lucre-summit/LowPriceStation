import type { RankOptions } from "../domain/rank";
import type { ListMode } from "./types";

/**
 * The one place that decides what a mode means. Nearby ranks what the driver can filter to;
 * favorites lists everything they saved, wherever it is, nearest first, and keeps a station
 * whose connector does not fit the current car so that saved data never looks lost.
 */
export function listOptionsFor(mode: ListMode, base: RankOptions): RankOptions {
  if (mode === "nearby") return base;
  return {
    ...base,
    radiusKm: Number.POSITIVE_INFINITY,
    minPowerKw: 0,
    network: null,
    sort: "nearest",
    requireCompatibleConnector: false,
  };
}
