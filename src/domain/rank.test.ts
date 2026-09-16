import assert from "node:assert/strict";
import test from "node:test";

import { rankStations, type RankOptions } from "./rank";
import { bangNa, buildStations, buildTariffs, checkedToday, makeStation, tuesdayNight } from "./fixtures";
import { DEFAULT_VEHICLE } from "./types";

const base: RankOptions = {
  origin: bangNa,
  departure: tuesdayNight,
  now: checkedToday,
  radiusKm: 10,
  minPowerKw: 0,
  network: null,
  sort: "cheapest",
};

const ids = (options: Partial<RankOptions>) =>
  rankStations(buildStations(), buildTariffs(), DEFAULT_VEHICLE, { ...base, ...options }).map((r) => r.station.id);

test("only stations inside the radius and compatible with the car are listed", () => {
  assert.deepEqual(ids({}), ["pea-25kw", "pea-120kw", "elex-150kw", "pluz-100kw"]);
  assert.ok(!ids({}).includes("pea-far"), "a station 45 km away is outside a 10 km radius");
  assert.ok(!ids({}).includes("pea-ac-only"), "a Type 2 only station cannot charge a CCS2 car");
});

test("cheapest first uses the session cost, and unknown prices never outrank a known one", () => {
  const order = ids({});
  const pea = rankStations(buildStations(), buildTariffs(), DEFAULT_VEHICLE, base).find(
    (r) => r.station.id === "pea-120kw",
  );
  assert.equal(pea?.price?.sessionCostThb, 106.2);
  assert.equal(order.at(-1), "pluz-100kw");
  assert.equal(
    rankStations(buildStations(), buildTariffs(), DEFAULT_VEHICLE, base).find((r) => r.station.id === "pluz-100kw")
      ?.price,
    null,
  );
});

test("nearest first ignores price order", () => {
  assert.deepEqual(ids({ sort: "nearest" }), ["pea-25kw", "pea-120kw", "pluz-100kw", "elex-150kw"]);
});

test("minimum power and network filters narrow the list", () => {
  assert.deepEqual(ids({ minPowerKw: 100 }), ["pea-120kw", "elex-150kw", "pluz-100kw"]);
  assert.deepEqual(ids({ network: "PEA VOLTA" }), ["pea-25kw", "pea-120kw"]);
});

test("a rate checked more than 90 days ago is flagged stale", () => {
  const ranked = rankStations(buildStations(), buildTariffs(), DEFAULT_VEHICLE, base);
  assert.equal(ranked.find((r) => r.station.id === "elex-150kw")?.stalePrice, true);
  assert.equal(ranked.find((r) => r.station.id === "pea-120kw")?.stalePrice, false);
  assert.equal(ranked.find((r) => r.station.id === "pluz-100kw")?.checkedAt, null);
});

test("an on-peak arrival makes the peak price apply", () => {
  const morning = rankStations(buildStations(), buildTariffs(), DEFAULT_VEHICLE, {
    ...base,
    departure: new Date(2026, 8, 15, 10, 0),
  });
  assert.equal(morning.find((r) => r.station.id === "pea-120kw")?.price?.sessionCostThb, 124.2);
});

test("each station is priced for the time the driver would actually arrive there", () => {
  const departure = new Date(2026, 8, 15, 21, 50);
  const near = makeStation("pea-120kw-near", "PEA VOLTA", 13.6702, 100.6081, [
    { standard: "CCS2", maxPowerKw: 120, count: 1 },
  ]);
  const far = makeStation("pea-120kw-10km", "PEA VOLTA", 13.6685, 100.696, [
    { standard: "CCS2", maxPowerKw: 120, count: 1 },
  ]);
  const ranked = rankStations([near, far], buildTariffs(), DEFAULT_VEHICLE, {
    ...base,
    departure,
    radiusKm: 25,
  });
  const priceOf = (id: string) => ranked.find((r) => r.station.id === id)?.price ?? null;
  assert.equal(priceOf("pea-120kw-near")?.window, "on-peak");
  assert.equal(priceOf("pea-120kw-10km")?.window, "off-peak");
  assert.ok(
    (priceOf("pea-120kw-10km")?.sessionCostThb ?? 0) < (priceOf("pea-120kw-near")?.sessionCostThb ?? 0),
    "the station reached after the peak window ends is cheaper",
  );
});
