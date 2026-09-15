import type { Connector, NetworkTariff, PeakWindow, Rate, VehicleProfile } from "./types";

export type PriceWindow = "flat" | "on-peak" | "off-peak";

export interface PriceForConnector {
  connector: Connector;
  rate: Rate;
  window: PriceWindow;
  unitPriceThb: number;
  /** What the driver's session costs in total, or null when the tariff is not quoted per kWh. */
  sessionCostThb: number | null;
}

/** Energy the driver needs, from their battery and charge range, unless they override it for one session. */
export function energyToAddKwh(profile: VehicleProfile, overrideKwh?: number | null): number {
  if (overrideKwh != null && overrideKwh > 0) return overrideKwh;
  const span = Math.max(0, profile.socTo - profile.socFrom);
  return (profile.batteryKwh * span) / 100;
}

/**
 * Whether the arrival time falls in a network's on-peak window.
 * Windows are read in the device's local time, which is Thai time for this app's users;
 * a window whose end precedes its start is treated as crossing midnight.
 */
export function isWithinPeakWindow(arrival: Date, peakWindow: PeakWindow | null): boolean {
  if (!peakWindow || peakWindow.days.length === 0) return false;
  const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][arrival.getDay()];
  if (!peakWindow.days.includes(day)) return false;
  const minutes = arrival.getHours() * 60 + arrival.getMinutes();
  const [startHour, startMinute] = peakWindow.start.split(":").map(Number);
  const [endHour, endMinute] = peakWindow.end.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/**
 * The rate that prices a connector. Bands share their boundaries in published rate cards
 * (0-50 kW, 50-180 kW, 180-200 kW), so the band with the highest floor wins: a 50 kW gun is
 * priced by the 50-180 kW band, exactly as the networks publish it.
 */
export function selectRate(tariff: NetworkTariff, connector: Connector): Rate | null {
  const matches = tariff.rates.filter(
    (rate) =>
      rate.connectorStandard === connector.standard &&
      connector.maxPowerKw >= rate.minPowerKw &&
      connector.maxPowerKw <= rate.maxPowerKw,
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, rate) => (rate.minPowerKw > best.minPowerKw ? rate : best));
}

/** Price of charging this connector at this arrival time, or null when the tariff does not cover it. */
export function priceForConnector(
  connector: Connector,
  tariff: NetworkTariff,
  arrival: Date,
  energyKwh: number,
): PriceForConnector | null {
  const rate = selectRate(tariff, connector);
  if (!rate) return null;
  const onPeak = isWithinPeakWindow(arrival, tariff.peakWindow);
  const unitPriceThb = rate.flatThb ?? (onPeak ? rate.onPeakThb : rate.offPeakThb);
  if (unitPriceThb == null) return null;
  return {
    connector,
    rate,
    window: rate.flatThb != null ? "flat" : onPeak ? "on-peak" : "off-peak",
    unitPriceThb,
    sessionCostThb: rate.unit === "kWh" ? energyKwh * unitPriceThb : null,
  };
}
