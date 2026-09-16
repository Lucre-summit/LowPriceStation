// Fixtures for the domain tests. Rates mirror the published cards; the coordinates sit around Bang Na.

import type { NetworkTariff, Station, TariffsDocument } from "./types";

export const peakWindowWeekdays = { days: ["mon", "tue", "wed", "thu", "fri"], start: "09:00", end: "22:00" };

// 2026-09-15 is a Tuesday, so these three cover on-peak, off-peak-by-hour and off-peak-by-day.
export const tuesdayMorning = new Date(2026, 8, 15, 10, 0);
export const tuesdayNight = new Date(2026, 8, 15, 23, 0);
export const saturdayMorning = new Date(2026, 8, 19, 10, 0);
export const checkedToday = new Date(2026, 8, 15, 12, 0);

const peaVolta: NetworkTariff = {
  network: "PEA VOLTA",
  effectiveFrom: "2026-05-01",
  checkedAt: "2026-09-15",
  sourceUrl: "https://peavoltaev.pea.co.th/low-priority/",
  evidence: "primary",
  peakWindow: peakWindowWeekdays,
  idleFee: { unit: "minute", priceThb: 10, graceMinutes: 3 },
  rates: [
    { connectorStandard: "CCS2", minPowerKw: 0, maxPowerKw: 50, unit: "kWh", flatThb: null, onPeakThb: 5.9, offPeakThb: 4.9 },
    { connectorStandard: "CCS2", minPowerKw: 50, maxPowerKw: 180, unit: "kWh", flatThb: null, onPeakThb: 6.9, offPeakThb: 5.9 },
    { connectorStandard: "Type 2", minPowerKw: 0, maxPowerKw: 25, unit: "hour", flatThb: 60, onPeakThb: null, offPeakThb: null },
  ],
  siteOverrides: [],
};

// A flat-rate network whose record has not been checked for more than the staleness window.
const elex: NetworkTariff = {
  network: "EleX by EGAT",
  effectiveFrom: "2026-01-01",
  checkedAt: "2026-02-01",
  sourceUrl: "https://egatev.egat.co.th/our-services/elexa/",
  evidence: "secondary",
  peakWindow: null,
  idleFee: null,
  rates: [
    { connectorStandard: "CCS2", minPowerKw: 0, maxPowerKw: 250, unit: "kWh", flatThb: 7.5, onPeakThb: null, offPeakThb: null },
  ],
  siteOverrides: [],
};

export function buildTariffs(): TariffsDocument {
  return { version: 1, updatedAt: "2026-09-15", networks: [peaVolta, elex] };
}

export function makeStation(
  id: string,
  network: string,
  lat: number,
  lng: number,
  connectors: Station["connectors"],
): Station {
  return {
    id,
    name: id,
    network,
    position: { lat, lng },
    connectors,
    address: null,
    openingHours: null,
    notes: null,
    sourceIds: [{ source: "test", id }],
  };
}

export const bangNa = { lat: 13.6685, lng: 100.6045 };

export function buildStations(): Station[] {
  return [
    makeStation("pea-120kw", "PEA VOLTA", 13.6702, 100.6081, [{ standard: "CCS2", maxPowerKw: 120, count: 2 }]),
    makeStation("elex-150kw", "EleX by EGAT", 13.6799, 100.6222, [{ standard: "CCS2", maxPowerKw: 150, count: 1 }]),
    makeStation("pluz-100kw", "EV Station PluZ", 13.6651, 100.5991, [{ standard: "CCS2", maxPowerKw: 100, count: 4 }]),
    makeStation("pea-25kw", "PEA VOLTA", 13.6689, 100.6052, [{ standard: "CCS2", maxPowerKw: 25, count: 1 }]),
    makeStation("pea-ac-only", "PEA VOLTA", 13.6681, 100.6050, [{ standard: "Type 2", maxPowerKw: 22, count: 1 }]),
    makeStation("pea-far", "PEA VOLTA", 14.0790, 100.6045, [{ standard: "CCS2", maxPowerKw: 25, count: 1 }]),
  ];
}
