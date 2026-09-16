import assert from "node:assert/strict";
import test from "node:test";

import { parseStoredFavorites, toggleFavorite } from "./favorites";

const savedAt = new Date(2026, 8, 17, 9, 30);

test("a missing, unreadable or junk store yields no favorites", () => {
  assert.deepEqual(parseStoredFavorites(null), []);
  assert.deepEqual(parseStoredFavorites("{ not json"), []);
  assert.deepEqual(parseStoredFavorites('{"stationId":"pea-volta-0001"}'), []);
  assert.deepEqual(parseStoredFavorites("[null, 7, {\"stationId\":\"\"}, {\"savedAt\":\"2026-09-17T02:30:00.000Z\"}]"), []);
});

test("a stored favorite is read back as written", () => {
  const stored = parseStoredFavorites('[{"stationId":"pluz-1","savedAt":"2026-09-17T02:30:00.000Z"}]');
  assert.deepEqual(stored, [{ stationId: "pluz-1", savedAt: "2026-09-17T02:30:00.000Z" }]);
});

test("the same station saved twice collapses to its newest record", () => {
  const stored = parseStoredFavorites(
    '[{"stationId":"pluz-1","savedAt":"2026-09-17T02:30:00.000Z"},{"stationId":"pluz-1","savedAt":"2026-09-18T02:30:00.000Z"}]',
  );
  assert.deepEqual(stored, [{ stationId: "pluz-1", savedAt: "2026-09-18T02:30:00.000Z" }]);
});

test("toggling saves a station and toggling again removes it", () => {
  const saved = toggleFavorite([], "pea-volta-0012", savedAt);
  assert.deepEqual(saved, [{ stationId: "pea-volta-0012", savedAt: savedAt.toISOString() }]);

  const removed = toggleFavorite(saved, "pea-volta-0012", savedAt);
  assert.deepEqual(removed, []);
});

test("toggling one station leaves the others in place", () => {
  const first = toggleFavorite([], "pluz-1", savedAt);
  const second = toggleFavorite(first, "mea-bma-323", savedAt);
  assert.deepEqual(second.map((favorite) => favorite.stationId), ["pluz-1", "mea-bma-323"]);

  const removedFirst = toggleFavorite(second, "pluz-1", savedAt);
  assert.deepEqual(removedFirst.map((favorite) => favorite.stationId), ["mea-bma-323"]);
});
