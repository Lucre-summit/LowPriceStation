// Shapes of the curated data documents. Kept in step with scripts/validate-data.mjs,
// which is the guard that stops a malformed document from shipping.

export type ConnectorStandard = "CCS2" | "Type 2" | "CHAdeMO" | "GB/T";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Connector {
  standard: ConnectorStandard;
  maxPowerKw: number;
  count: number;
}

export interface Station {
  id: string;
  name: string;
  /** A network name, or "unattributed" when the source did not name one. */
  network: string;
  position: LatLng;
  connectors: Connector[];
  address: string | null;
  openingHours: string | null;
  notes: string | null;
  sourceIds: { source: string; id: string }[];
}

export interface StationsDocument {
  version: number;
  updatedAt: string;
  stations: Station[];
}

/** The unit a tariff is quoted in. Thai networks use kWh for DC and hours or minutes elsewhere. */
export type Unit = "kWh" | "hour" | "minute";

export interface Rate {
  connectorStandard: ConnectorStandard;
  minPowerKw: number;
  maxPowerKw: number;
  unit: Unit;
  /** Set when the network charges one price all day. */
  flatThb: number | null;
  /** Set together with offPeakThb when the network has a time-of-use window. */
  onPeakThb: number | null;
  offPeakThb: number | null;
}

export interface PeakWindow {
  days: string[];
  start: string;
  end: string;
}

export interface IdleFee {
  unit: "minute" | "hour";
  priceThb: number;
  graceMinutes: number;
}

/** Links to a network's own app, recorded only where someone verified them. */
export interface NetworkAppLinks {
  android?: string | null;
  ios?: string | null;
  web?: string | null;
}

export interface NetworkTariff {
  network: string;
  /** Null when the network publishes no effective date; treat checkedAt as when the rate was observed. */
  effectiveFrom: string | null;
  checkedAt: string;
  sourceUrl: string;
  /** "secondary" means the rate came from trade media or a social post, not the operator's own page. */
  evidence: "primary" | "secondary";
  peakWindow: PeakWindow | null;
  idleFee: IdleFee | null;
  /** Optional: most Thai networks publish no app link, and the app then searches the store instead. */
  appLinks?: NetworkAppLinks | null;
  rates: Rate[];
  siteOverrides: unknown[];
}

export interface TariffsDocument {
  version: number;
  updatedAt: string;
  networks: NetworkTariff[];
}

export interface VehicleProfile {
  connectorStandard: ConnectorStandard;
  batteryKwh: number;
  /** Percentage of the battery the driver starts a charge at. */
  socFrom: number;
  /** Percentage of the battery the driver charges to. */
  socTo: number;
}

export const UNATTRIBUTED = "unattributed";

/** The two standards Thailand adopted nationally: Type 2 for AC and CCS2 for DC. */
export const NATIONAL_STANDARDS: ConnectorStandard[] = ["CCS2", "Type 2"];

export const DEFAULT_VEHICLE: VehicleProfile = {
  connectorStandard: "CCS2",
  batteryKwh: 30,
  socFrom: 20,
  socTo: 80,
};
