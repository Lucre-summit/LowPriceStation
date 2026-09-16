import type { PriceForConnector } from "../domain/price";
import { strings } from "./strings";

export function formatDistanceKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}${strings.metreSuffix}` : `${km.toFixed(1)}${strings.kilometreSuffix}`;
}

/** The station's headline number: what this driver would pay for their session. */
export function formatSessionCost(costThb: number | null): string | null {
  return costThb == null ? null : `${strings.costPrefix}${Math.round(costThb)}${strings.costSuffix}`;
}

export function formatUnitPrice(price: PriceForConnector | null): string {
  if (!price) return strings.unknownPrice;
  const unit =
    price.rate.unit === "kWh"
      ? strings.unitPerKwh
      : price.rate.unit === "hour"
        ? strings.unitPerHour
        : strings.unitPerMinute;
  const window = price.window === "on-peak" ? " · peak" : price.window === "off-peak" ? " · off-peak" : "";
  return `${price.unitPriceThb.toFixed(2)} ฿/${unit}${window}`;
}

export function formatClock(time: Date): string {
  return `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
}

export function formatEnergy(kwh: number): string {
  return Number.isInteger(kwh) ? String(kwh) : kwh.toFixed(1);
}
