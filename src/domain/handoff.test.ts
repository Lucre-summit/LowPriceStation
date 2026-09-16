import assert from "node:assert/strict";
import test from "node:test";

import { navigationCandidates, networkAppCandidates } from "./handoff";

// Coordinates of PEA VOLTA สำนักงานใหญ่, used throughout the fixtures.
const station = { lat: 13.6702, lng: 100.6081 };
const PLAY_PLUZ = "https://play.google.com/store/apps/details?id=com.pttor.evstationpluz";
const WEB_MEA = "https://ev.mea.or.th/";

test("navigation starts in the platform's own map app, with the web form kept as a fallback", () => {
  assert.deepEqual(navigationCandidates("android", station), [
    "google.navigation:q=13.6702,100.6081&mode=d",
    "https://www.google.com/maps/dir/?api=1&destination=13.6702,100.6081&travelmode=driving",
  ]);
  assert.deepEqual(navigationCandidates("ios", station), [
    "https://maps.apple.com/directions?destination=13.6702,100.6081&mode=driving",
    "https://www.google.com/maps/dir/?api=1&destination=13.6702,100.6081&travelmode=driving",
  ]);
});

test("on the web only the one form is handed over", () => {
  assert.deepEqual(navigationCandidates("web", station), [
    "https://www.google.com/maps/dir/?api=1&destination=13.6702,100.6081&travelmode=driving",
  ]);
});

test("a network with a known store page hands that over, then a search for it", () => {
  assert.deepEqual(networkAppCandidates("android", "EV Station PluZ", { android: PLAY_PLUZ }), [
    PLAY_PLUZ,
    "https://play.google.com/store/search?q=EV%20Station%20PluZ&c=apps",
  ]);
  assert.deepEqual(networkAppCandidates("web", "MEA EV", { android: PLAY_PLUZ, web: WEB_MEA }), [
    WEB_MEA,
    "https://play.google.com/store/search?q=MEA%20EV&c=apps",
  ]);
});

test("a network with no known page gets the store's search for its name", () => {
  assert.deepEqual(networkAppCandidates("ios", "EleX by EGAT", null), [
    "https://apps.apple.com/search?term=EleX%20by%20EGAT",
  ]);
});
