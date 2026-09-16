import assert from "node:assert/strict";
import test from "node:test";

import { CITY_SPEED_KMH, HIGHWAY_SPEED_KMH, estimateArrival, travelMinutes } from "./eta";

const departure = new Date(2026, 8, 16, 21, 50);

test("travel time follows distance at the average city speed", () => {
  assert.equal(CITY_SPEED_KMH, 25);
  assert.equal(HIGHWAY_SPEED_KMH, 80);
  assert.equal(travelMinutes(0), 0);
  assert.equal(travelMinutes(10), 24);
  assert.equal(travelMinutes(2.5), 6);
});

test("a station beyond the city is reached at open-road speed, not city speed", () => {
  // 10 km of city at 25 km/h (24 min) plus 40 km of open road at 80 km/h (30 min).
  assert.equal(travelMinutes(50), 54);
  // …plus 60 km of open road at 80 km/h (45 min).
  assert.equal(travelMinutes(70), 69);
});

test("the estimate never goes backwards as distance grows", () => {
  const minutes = [0, 1, 5, 10, 11, 25, 50, 120, 400].map((km) => travelMinutes(km));
  assert.ok(minutes.every((value, index) => index === 0 || value >= minutes[index - 1]), JSON.stringify(minutes));
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
