import assert from "node:assert/strict";
import test from "node:test";

import { parseStoredProfile } from "./profile";
import { DEFAULT_VEHICLE } from "../domain/types";

test("a missing, unreadable or incomplete stored profile falls back to the defaults", () => {
  assert.deepEqual(parseStoredProfile(null), DEFAULT_VEHICLE);
  assert.deepEqual(parseStoredProfile("{ this is not json"), DEFAULT_VEHICLE);
  assert.deepEqual(parseStoredProfile(JSON.stringify({ batteryKwh: 60 })), DEFAULT_VEHICLE);
  assert.deepEqual(parseStoredProfile(JSON.stringify({ connectorStandard: "NACS", batteryKwh: 60, socFrom: 10, socTo: 90 })), DEFAULT_VEHICLE);
});

test("a stored profile is read back as written", () => {
  const stored = parseStoredProfile(
    JSON.stringify({ connectorStandard: "Type 2", batteryKwh: 60, socFrom: 10, socTo: 90 }),
  );
  assert.deepEqual(stored, { connectorStandard: "Type 2", batteryKwh: 60, socFrom: 10, socTo: 90 });
});

test("nonsense numbers fall back to the default battery or charge range", () => {
  const zeroBattery = parseStoredProfile(
    JSON.stringify({ connectorStandard: "CCS2", batteryKwh: 0, socFrom: 10, socTo: 90 }),
  );
  assert.equal(zeroBattery.batteryKwh, DEFAULT_VEHICLE.batteryKwh);
  const invertedRange = parseStoredProfile(
    JSON.stringify({ connectorStandard: "CCS2", batteryKwh: 60, socFrom: 90, socTo: 20 }),
  );
  assert.equal(invertedRange.socFrom, DEFAULT_VEHICLE.socFrom);
  assert.equal(invertedRange.socTo, DEFAULT_VEHICLE.socTo);
  const outOfRange = parseStoredProfile(
    JSON.stringify({ connectorStandard: "CCS2", batteryKwh: 60, socFrom: -10, socTo: 120 }),
  );
  assert.equal(outOfRange.socFrom, DEFAULT_VEHICLE.socFrom);
  assert.equal(outOfRange.socTo, DEFAULT_VEHICLE.socTo);
});
