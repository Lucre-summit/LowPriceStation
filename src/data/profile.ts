// The driver's car lives on the phone. It is what turns a published rate into the cost of
// their actual session, so a corrupt or half-written value must never leave the app guessing.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_VEHICLE, NATIONAL_STANDARDS, type ConnectorStandard, type VehicleProfile } from "../domain/types";

export const PROFILE_STORAGE_KEY = "vehicle-profile.v1";

// Wider than the two standards the app offers, so a profile written on a device that knew
// about CHAdeMO or GB/T cars is still read back rather than silently reset.
const ACCEPTED_STANDARDS: ConnectorStandard[] = [...NATIONAL_STANDARDS, "CHAdeMO", "GB/T"];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Turns anything into a vehicle the ranking can trust, falling back to the defaults. */
export function coerceVehicleProfile(candidate: unknown): VehicleProfile {
  if (candidate == null || typeof candidate !== "object") return DEFAULT_VEHICLE;
  const partial = candidate as Partial<VehicleProfile>;

  const standard = ACCEPTED_STANDARDS.includes(partial.connectorStandard as ConnectorStandard)
    ? (partial.connectorStandard as ConnectorStandard)
    : null;
  const battery =
    isFiniteNumber(partial.batteryKwh) && partial.batteryKwh >= 5 && partial.batteryKwh <= 200
      ? partial.batteryKwh
      : null;
  const socFrom =
    isFiniteNumber(partial.socFrom) && partial.socFrom >= 0 && partial.socFrom <= 100 ? partial.socFrom : null;
  const socTo =
    isFiniteNumber(partial.socTo) && partial.socTo >= 0 && partial.socTo <= 100 ? partial.socTo : null;
  const rangeIsUsable = socFrom != null && socTo != null && socTo > socFrom;

  if (!standard || battery == null) return DEFAULT_VEHICLE;
  return {
    connectorStandard: standard,
    batteryKwh: battery,
    socFrom: rangeIsUsable ? socFrom : DEFAULT_VEHICLE.socFrom,
    socTo: rangeIsUsable ? socTo : DEFAULT_VEHICLE.socTo,
  };
}

/** A stored value is trusted only as far as it parses and describes a plausible car. */
export function parseStoredProfile(raw: string | null): VehicleProfile {
  if (!raw) return DEFAULT_VEHICLE;
  try {
    return coerceVehicleProfile(JSON.parse(raw));
  } catch {
    return DEFAULT_VEHICLE;
  }
}

export async function loadProfile(): Promise<VehicleProfile> {
  return parseStoredProfile(await AsyncStorage.getItem(PROFILE_STORAGE_KEY));
}

export async function saveProfile(profile: VehicleProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}
