import assert from "node:assert/strict";
import test from "node:test";

import { AVERAGE_CITY_SPEED_KMH, estimateArrival, travelMinutes } from "./eta";

const departure = new Date(2026, 8, 16, 21, 50);

test("travel time follows distance at the average city speed", () => {
  assert.equal(AVERAGE_CITY_SPEED_KMH, 25);
  assert.equal(travelMinutes(0), 0);
  assert.equal(travelMinutes(10), 24);
  assert.equal(travelMinutes(2.5), 6);
});

test("arrival is the departure plus the travel time, rounded to the minute", () => {
  assert.equal(estimateArrival(departure, 10).getHours(), 22);
  assert.equal(estimateArrival(departure, 10).getMinutes(), 14);
  assert.equal(estimateArrival(departure, 0).getTime(), departure.getTime());
  assert.equal(estimateArrival(departure, 0.2).getTime(), new Date(2026, 8, 16, 21, 50).getTime());
});

test("a slower speed pushes the arrival later", () => {
  assert.equal(travelMinutes(10, 20), 30);
  assert.equal(estimateArrival(departure, 10, 20).getMinutes(), 20);
});
