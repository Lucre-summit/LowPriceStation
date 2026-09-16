import assert from "node:assert/strict";
import test from "node:test";

import { navigationUrl, networkAppUrl, platformFor } from "./handoff";

// Coordinates of PEA VOLTA สำนักงานใหญ่, used throughout the fixtures.
const station = { lat: 13.6702, lng: 100.6081 };

test("navigation hands off to the platform's own map app", () => {
  assert.equal(navigationUrl("android", station), "google.navigation:q=13.6702,100.6081&mode=d");
  assert.equal(
    navigationUrl("ios", station),
    "https://maps.apple.com/directions?destination=13.6702,100.6081&mode=driving",
  );
  assert.equal(
    navigationUrl("web", station),
    "https://www.google.com/maps/dir/?api=1&destination=13.6702,100.6081&travelmode=driving",
  );
});

test("only the two mobile runtimes get their own handoff flavour", () => {
  assert.equal(platformFor("android"), "android");
  assert.equal(platformFor("ios"), "ios");
  assert.equal(platformFor("web"), "web");
  assert.equal(platformFor("windows"), "web");
  assert.equal(platformFor("macos"), "web");
});

test("a network with a known store link opens that link", () => {
  const links = { android: "https://play.google.com/store/apps/details?id=com.pttor.evstationpluz" };
  assert.equal(networkAppUrl("android", "EV Station PluZ", links), links.android);
  assert.equal(
    networkAppUrl("ios", "EV Station PluZ", links),
    "https://apps.apple.com/search?term=EV%20Station%20PluZ",
  );
});

test("a network with no known link falls back to searching the store", () => {
  assert.equal(
    networkAppUrl("android", "EleX by EGAT", null),
    "https://play.google.com/store/search?q=EleX%20by%20EGAT&c=apps",
  );
  assert.equal(networkAppUrl("ios", "EleX by EGAT", null), "https://apps.apple.com/search?term=EleX%20by%20EGAT");
});

test("a web fallback link is preferred on web when the network publishes one", () => {
  const links = { android: "https://play.google.com/store/apps/details?id=th.mea.evcharger", web: "https://ev.mea.or.th/" };
  assert.equal(networkAppUrl("web", "MEA EV", links), "https://ev.mea.or.th/");
  assert.equal(networkAppUrl("web", "MEA EV", { android: "https://play.google.com/store/apps/details?id=x" }), "https://play.google.com/store/apps/details?id=x");
});
