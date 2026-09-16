import assert from "node:assert/strict";
import test from "node:test";

import { boundsOf } from "./bounds";
import { bangNa, buildStations, buildTariffs, checkedToday, tuesdayNight } from "../../domain/fixtures";
import { rankStations } from "../../domain/rank";
import { DEFAULT_VEHICLE } from "../../domain/types";

const ranked = () =>
  rankStations(buildStations(), buildTariffs(), DEFAULT_VEHICLE, {
    origin: bangNa,
    departure: tuesdayNight,
    now: checkedToday,
    radiusKm: 10,
    minPowerKw: 0,
    network: null,
    sort: "cheapest",
  });

test("an empty result set has no bounds", () => {
  assert.equal(boundsOf([]), null);
});

test("bounds cover every station in the result set", () => {
  const bounds = boundsOf(ranked());
  assert.ok(bounds);
  for (const entry of ranked()) {
    assert.ok(entry.station.position.lat >= bounds.minLat && entry.station.position.lat <= bounds.maxLat);
    assert.ok(entry.station.position.lng >= bounds.minLng && entry.station.position.lng <= bounds.maxLng);
  }
});

test("a single station still yields a usable box around it", () => {
  const [only] = ranked().slice(0, 1);
  const bounds = boundsOf([only]);
  assert.ok(bounds);
  assert.ok(bounds.maxLat > bounds.minLat, "the box has height even for one point");
  assert.ok(bounds.maxLng > bounds.minLng, "the box has width even for one point");
  assert.ok(bounds.minLat < only.station.position.lat && only.station.position.lat < bounds.maxLat);
});
