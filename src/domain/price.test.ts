import assert from "node:assert/strict";
import test from "node:test";

import { energyToAddKwh, isWithinPeakWindow, priceForConnector, selectRate } from "./price";
import { buildTariffs, peakWindowWeekdays, saturdayMorning, tuesdayMorning, tuesdayNight } from "./fixtures";
import { DEFAULT_VEHICLE, type Connector } from "./types";

const ccs2 = (maxPowerKw: number): Connector => ({ standard: "CCS2", maxPowerKw, count: 1 });
const peaTariff = buildTariffs().networks[0];
const elexTariff = buildTariffs().networks[1];

test("energy to add follows the battery and charge range, and an override wins", () => {
  assert.equal(energyToAddKwh({ ...DEFAULT_VEHICLE, batteryKwh: 60, socFrom: 20, socTo: 80 }), 36);
  assert.equal(energyToAddKwh({ ...DEFAULT_VEHICLE, batteryKwh: 60, socFrom: 20, socTo: 80 }, 10), 10);
  assert.equal(energyToAddKwh({ ...DEFAULT_VEHICLE, batteryKwh: 60, socFrom: 80, socTo: 80 }), 0);
});

test("a 50 kW gun is priced by the 50-180 kW band, not the 0-50 kW band", () => {
  assert.equal(selectRate(peaTariff, ccs2(50))?.offPeakThb, 5.9);
  assert.equal(selectRate(peaTariff, ccs2(25))?.offPeakThb, 4.9);
  assert.equal(selectRate(peaTariff, ccs2(180))?.onPeakThb, 6.9);
});

test("the time-of-use window decides which price applies", () => {
  assert.equal(priceForConnector(ccs2(120), peaTariff, tuesdayMorning, 18)?.unitPriceThb, 6.9);
  assert.equal(priceForConnector(ccs2(120), peaTariff, tuesdayMorning, 18)?.window, "on-peak");
  assert.equal(priceForConnector(ccs2(120), peaTariff, tuesdayNight, 18)?.unitPriceThb, 5.9);
  assert.equal(priceForConnector(ccs2(120), peaTariff, saturdayMorning, 18)?.unitPriceThb, 5.9);
  assert.equal(isWithinPeakWindow(tuesdayMorning, peakWindowWeekdays), true);
  assert.equal(isWithinPeakWindow(saturdayMorning, peakWindowWeekdays), false);
});

test("a flat network is priced flat whenever the driver arrives", () => {
  const morning = priceForConnector(ccs2(150), elexTariff, tuesdayMorning, 18);
  const night = priceForConnector(ccs2(150), elexTariff, tuesdayNight, 18);
  assert.equal(morning?.window, "flat");
  assert.equal(night?.unitPriceThb, 7.5);
});

test("session cost is energy times price for a per-kWh tariff, and unknown for any other unit", () => {
  assert.equal(priceForConnector(ccs2(120), peaTariff, tuesdayNight, 18)?.sessionCostThb, 106.2);
  assert.equal(priceForConnector({ standard: "Type 2", maxPowerKw: 22, count: 1 }, peaTariff, tuesdayNight, 18)?.sessionCostThb, null);
});

test("a connector the tariff does not cover has no price", () => {
  assert.equal(priceForConnector({ standard: "CHAdeMO", maxPowerKw: 50, count: 1 }, peaTariff, tuesdayMorning, 18), null);
  assert.equal(priceForConnector(ccs2(250), elexTariff, tuesdayMorning, 18)?.unitPriceThb, 7.5);
  assert.equal(priceForConnector(ccs2(300), elexTariff, tuesdayMorning, 18), null);
});
