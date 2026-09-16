import type { PriceForConnector } from "../domain/price";
import type { RankedStation } from "../domain/rank";
import type { Connector } from "../domain/types";
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

export function formatConnector(connector: Connector): string {
  return `${connector.standard} · ${connector.maxPowerKw} kW × ${connector.count}`;
}

export interface StationHeadline {
  text: string;
  /** True when the headline is a real cost rather than an explanation of what is missing. */
  emphasized: boolean;
}

/** What a driver sees first about a station: its cost, or why there is no cost to show. */
export function formatStationHeadline(entry: RankedStation): StationHeadline {
  if (!entry.compatible) return { text: strings.connectorMismatch, emphasized: false };
  const cost = formatSessionCost(entry.price?.sessionCostThb ?? null);
  return cost ? { text: cost, emphasized: true } : { text: strings.unknownPrice, emphasized: false };
}

/** The one sentence used wherever a saved station no longer matches the loaded data. */
export function formatUnmatchedFavorites(count: number): string {
  return `${strings.unmatchedFavoritesPrefix}${count}${strings.unmatchedFavoritesSuffix}`;
}

export function formatEnergy(kwh: number): string {
  return Number.isInteger(kwh) ? String(kwh) : kwh.toFixed(1);
}

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const DAY_LABELS: Record<string, string> = {
  mon: "จ.",
  tue: "อ.",
  wed: "พ.",
  thu: "พฤ.",
  fri: "ศ.",
  sat: "ส.",
  sun: "อา.",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_ORDER = DAY_ORDER.slice(0, 5);
const WEEKEND_ORDER = DAY_ORDER.slice(5);

/**
 * The days a time-of-use window runs on, read from the tariff rather than assumed, so a window
 * that runs on weekends is never shown as a weekday one.
 */
export function formatPeakDays(days: string[]): string {
  const known = DAY_ORDER.filter((day) => days.includes(day));
  if (known.length === 0) return strings.flatAllDay;
  if (known.length === DAY_ORDER.length) return strings.everyDay;
  // A shorthand only stands for the whole set it names: a window that also covers Saturday
  // must list its days rather than claim to be the working week the pricer would not apply.
  if (known.length === WEEKDAY_ORDER.length && WEEKDAY_ORDER.every((day) => known.includes(day))) {
    return strings.weekdays;
  }
  if (known.length === WEEKEND_ORDER.length && WEEKEND_ORDER.every((day) => known.includes(day))) {
    return strings.weekend;
  }
  return known.map((day) => DAY_LABELS[day]).join(", ");
}

/** A Thai short date, with the Buddhist-era year Thai readers expect. */
function thaiShortDate(date: Date): string {
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

/** A checked date is shown as a Thai short date, or as-is when it does not parse. */
export function formatThaiDate(iso: string | null): string {
  if (!iso) return strings.dateUnknown;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return thaiShortDate(parsed);
}

/** When the price data on screen was last pulled from the network. */
export function formatFetchedAt(iso: string | null): string {
  if (!iso) return strings.fetchedAtUnknown;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return strings.fetchedAtUnknown;
  return `${strings.fetchedAtPrefix}${thaiShortDate(parsed)} ${formatClock(parsed)}`;
}
