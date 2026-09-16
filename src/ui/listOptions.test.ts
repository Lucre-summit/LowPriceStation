import assert from "node:assert/strict";
import test from "node:test";

import { listOptionsFor } from "./listOptions";
import type { RankOptions } from "../domain/rank";

const base: RankOptions = {
  origin: { lat: 13.6685, lng: 100.6045 },
  departure: new Date(2026, 8, 15, 9, 0),
  radiusKm: 10,
  minPowerKw: 100,
  network: "EV Station PluZ",
  sort: "cheapest",
  energyOverrideKwh: null,
};

test("nearby mode passes the driver's own filters through", () => {
  assert.deepEqual(listOptionsFor("nearby", base), base);
});

test("favorites mode ignores every filter and orders by distance", () => {
  const options = listOptionsFor("favorites", base);
  assert.equal(options.radiusKm, Number.POSITIVE_INFINITY);
  assert.equal(options.minPowerKw, 0);
  assert.equal(options.network, null);
  assert.equal(options.sort, "nearest");
  assert.equal(options.requireCompatibleConnector, false);
  assert.equal(options.origin, base.origin);
  assert.equal(options.departure, base.departure);
});
