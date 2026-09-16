#!/usr/bin/env node
// Validates the curated data documents before they can ship.
// Usage: node scripts/validate-data.mjs [stations.json] [tariffs.json]
// Exits non-zero, listing every problem it found, so a malformed record never reaches the app.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const NETWORKS = ["PEA VOLTA", "EV Station PluZ", "EleX by EGAT", "MEA EV", "EA Anywhere"];
const UNATTRIBUTED = "unattributed";
const STANDARDS = ["CCS2", "Type 2", "CHAdeMO", "GB/T"];
const UNITS = ["kWh", "hour", "minute"];
const EVIDENCE = ["primary", "secondary"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
// Thailand's bounding box, generous by a few kilometres.
const TH = { lat: [5.6, 20.5], lng: [97.3, 105.7] };
// Per-unit price ceiling in THB; anything above this is a data-entry mistake, not a tariff.
const MAX_UNIT_PRICE = 100;

const errors = [];
const at = (where, message) => errors.push(`${where}: ${message}`);

const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isHttpUrl = (v) => typeof v === "string" && /^https?:\/\//.test(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);
const inRange = (v, [lo, hi]) => isNum(v) && v >= lo && v <= hi;

function load(path, label) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    at(label, `cannot read ${path}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    at(label, `not valid JSON (${e.message})`);
    return null;
  }
}

function checkHeader(doc, label) {
  if (!isInt(doc.version) || doc.version < 1) at(label, "version must be a positive integer");
  if (!isStr(doc.updatedAt) || !DATE.test(doc.updatedAt)) at(label, "updatedAt must be YYYY-MM-DD");
}

function checkStations(doc, label) {
  if (!Array.isArray(doc.stations) || doc.stations.length === 0) {
    at(label, "stations must be a non-empty array");
    return new Set();
  }
  const seen = new Set();
  const networks = new Set();
  doc.stations.forEach((s, i) => {
    const where = `${label}.stations[${i}]${isStr(s?.id) ? ` (${s.id})` : ""}`;
    if (isStr(s?.network)) networks.add(s.network);
    if (!isStr(s?.id)) at(where, "missing id");
    else if (seen.has(s.id)) at(where, "duplicate id");
    else seen.add(s.id);
    if (!isStr(s?.name)) at(where, "missing name");
    if (!isStr(s?.network)) at(where, "missing network");
    else if (s.network !== UNATTRIBUTED && !NETWORKS.includes(s.network)) {
      at(where, `network "${s.network}" is neither a known network nor "${UNATTRIBUTED}"`);
    }
    if (!inRange(s?.position?.lat, TH.lat) || !inRange(s?.position?.lng, TH.lng)) {
      at(where, `position ${JSON.stringify(s?.position)} is outside Thailand`);
    }
    if (!Array.isArray(s?.connectors) || s.connectors.length === 0) {
      at(where, "connectors must be a non-empty array");
    } else {
      s.connectors.forEach((c, j) => {
        const cw = `${where}.connectors[${j}]`;
        if (!STANDARDS.includes(c?.standard)) at(cw, `unknown standard "${c?.standard}"`);
        if (!isNum(c?.maxPowerKw) || c.maxPowerKw <= 0 || c.maxPowerKw > 1000) {
          at(cw, `maxPowerKw ${c?.maxPowerKw} is not a plausible power`);
        }
        if (!isInt(c?.count) || c.count < 1) at(cw, `count ${c?.count} is not a positive integer`);
      });
    }
    if (!Array.isArray(s?.sourceIds) || s.sourceIds.length === 0) {
      at(where, "sourceIds must record at least one source");
    } else {
      s.sourceIds.forEach((src, j) => {
        if (!isStr(src?.source) || !isStr(String(src?.id ?? ""))) {
          at(`${where}.sourceIds[${j}]`, "source and id must both be present");
        }
      });
    }
  });
  return networks;
}

function checkRates(net, nw) {
  if (!Array.isArray(net.rates) || net.rates.length === 0) {
    at(nw, "rates must be a non-empty array");
    return;
  }
  net.rates.forEach((r, i) => {
    const rw = `${nw}.rates[${i}]`;
    if (!STANDARDS.includes(r?.connectorStandard)) at(rw, `unknown standard "${r?.connectorStandard}"`);
    if (!isNum(r?.minPowerKw) || !isNum(r?.maxPowerKw) || r.minPowerKw >= r.maxPowerKw) {
      at(rw, `power band ${r?.minPowerKw}-${r?.maxPowerKw} is not an increasing range`);
    }
    if (!UNITS.includes(r?.unit)) at(rw, `unknown unit "${r?.unit}"`);

    const prices = { flatThb: r?.flatThb, onPeakThb: r?.onPeakThb, offPeakThb: r?.offPeakThb };
    const set = Object.entries(prices).filter(([, v]) => v !== null && v !== undefined);
    if (set.length === 0) at(rw, "no price given");
    for (const [key, value] of set) {
      if (!isNum(value) || value <= 0 || value > MAX_UNIT_PRICE) {
        at(rw, `${key} ${value} is not a plausible price per ${r?.unit ?? "unit"}`);
      }
    }
    const peakish = ["onPeakThb", "offPeakThb"].filter((k) => prices[k] !== null && prices[k] !== undefined);
    if (peakish.length === 1) at(rw, "on-peak and off-peak prices must be given together");
    if (peakish.length === 2 && prices.flatThb !== null && prices.flatThb !== undefined) {
      at(rw, "a rate is either flat or time-of-use, not both");
    }
  });
}

function checkTariffs(doc, label) {
  if (!Array.isArray(doc.networks) || doc.networks.length === 0) {
    at(label, "networks must be a non-empty array");
    return new Set();
  }
  const seen = new Set();
  doc.networks.forEach((net, i) => {
    const nw = `${label}.networks[${i}]${isStr(net?.network) ? ` (${net.network})` : ""}`;
    if (!isStr(net?.network)) at(nw, "missing network");
    else if (!NETWORKS.includes(net.network)) at(nw, `unknown network "${net.network}"`);
    else if (seen.has(net.network)) at(nw, "duplicate network entry");
    else seen.add(net.network);

    const effective = net?.effectiveFrom;
    if (effective !== null && (!isStr(effective) || !DATE.test(effective))) {
      at(nw, "effectiveFrom must be YYYY-MM-DD, or null when the network publishes no date");
    }
    if (!isStr(net?.checkedAt) || !DATE.test(net.checkedAt)) at(nw, "checkedAt must be YYYY-MM-DD");
    if (!isHttpUrl(net?.sourceUrl)) at(nw, "sourceUrl must be an http(s) URL");
    if (!EVIDENCE.includes(net?.evidence)) at(nw, `evidence must be one of ${EVIDENCE.join(", ")}`);

    if (net?.peakWindow != null) {
      const pw = net.peakWindow;
      if (!Array.isArray(pw.days) || pw.days.length === 0 || pw.days.some((d) => !DAYS.includes(d))) {
        at(`${nw}.peakWindow`, "days must be a non-empty subset of mon..sun");
      }
      if (!TIME.test(pw?.start ?? "") || !TIME.test(pw?.end ?? "")) {
        at(`${nw}.peakWindow`, "start and end must be HH:MM");
      }
    }
    if (net?.idleFee != null) {
      const f = net.idleFee;
      if (!["minute", "hour"].includes(f?.unit)) at(`${nw}.idleFee`, `unknown unit "${f?.unit}"`);
      if (!isNum(f?.priceThb) || f.priceThb < 0 || f.priceThb > 1000) {
        at(`${nw}.idleFee`, `priceThb ${f?.priceThb} is not a plausible idle fee`);
      }
      if (!isInt(f?.graceMinutes) || f.graceMinutes < 0) {
        at(`${nw}.idleFee`, `graceMinutes ${f?.graceMinutes} is not a non-negative integer`);
      }
    }
    if (!Array.isArray(net?.siteOverrides)) at(nw, "siteOverrides must be an array (empty is fine)");
    if (net?.appLinks != null) {
      const links = net.appLinks;
      if (typeof links !== "object" || Array.isArray(links)) {
        at(`${nw}.appLinks`, "appLinks must be an object when present");
      } else {
        for (const [key, value] of Object.entries(links)) {
          if (!["android", "ios", "web"].includes(key)) at(`${nw}.appLinks`, `unknown platform "${key}"`);
          else if (value !== null && value !== undefined && !isHttpUrl(value)) {
            at(`${nw}.appLinks.${key}`, `link "${String(value)}" is not an http(s) URL`);
          }
        }
      }
    }
    checkRates(net, nw);
  });
  return seen;
}

const [stationsPath, tariffsPath, sourcesPath] = process.argv.slice(2);
const defaultPath = (name) => fileURLToPath(new URL(`../data/${name}`, import.meta.url));
const stationsDoc = load(stationsPath ?? defaultPath("stations.th.json"), "stations");
const tariffsDoc = load(tariffsPath ?? defaultPath("tariffs.th.json"), "tariffs");
const sourcesDoc = load(sourcesPath ?? defaultPath("sources.th.json"), "sources");

const recordedSources = new Set();
if (sourcesDoc) {
  checkHeader(sourcesDoc, "sources");
  if (!Array.isArray(sourcesDoc.sources) || sourcesDoc.sources.length === 0) {
    at("sources", "sources must be a non-empty array");
  } else {
    sourcesDoc.sources.forEach((source, i) => {
      const where = `sources.sources[${i}]${isStr(source?.id) ? ` (${source.id})` : ""}`;
      if (!isStr(source?.id)) at(where, "missing id");
      else if (recordedSources.has(source.id)) at(where, "duplicate id");
      else recordedSources.add(source.id);
      if (!isStr(source?.publisher)) at(where, "missing publisher");
      if (!isHttpUrl(source?.url)) at(where, "url must be an http(s) URL");
      if (source?.publishedAt !== null && !isStr(source?.publishedAt)) {
        at(where, "publishedAt must be a string or null");
      }
      if (!isStr(source?.checkedAt) || !DATE.test(source.checkedAt)) at(where, "checkedAt must be YYYY-MM-DD");
      if (!isStr(source?.covers)) at(where, "covers must say what the source provides");
    });
  }
}

let stationNetworks = new Set();
if (stationsDoc) {
  checkHeader(stationsDoc, "stations");
  stationNetworks = checkStations(stationsDoc, "stations");
}
let tariffNetworks = new Set();
if (tariffsDoc) {
  checkHeader(tariffsDoc, "tariffs");
  tariffNetworks = checkTariffs(tariffsDoc, "tariffs");
}

for (const doc of [stationsDoc, tariffsDoc]) {
  if (!doc) continue;
  const priced = (doc.stations ?? [])
    .map((s) => s?.network)
    .filter((n) => n && n !== UNATTRIBUTED && !tariffNetworks.has(n));
  for (const network of new Set(priced)) {
    at("cross-check", `stations reference network "${network}" that has no tariff entry, so it can never be ranked`);
  }
}

if (sourcesDoc && stationsDoc) {
  const cited = new Set((stationsDoc.stations ?? []).flatMap((station) => (station?.sourceIds ?? []).map((s) => s?.source)));
  for (const source of cited) {
    if (!recordedSources.has(source)) {
      at("cross-check", `stations cite source "${source}", which data/sources.th.json does not record`);
    }
  }
  for (const source of recordedSources) {
    if (!cited.has(source)) at("cross-check", `data/sources.th.json records "${source}", which no station cites`);
  }
}

if (errors.length > 0) {
  console.error(`data validation failed with ${errors.length} problem${errors.length === 1 ? "" : "s"}:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const stationCount = stationsDoc.stations.length;
const connectorCount = stationsDoc.stations.reduce((n, s) => n + (s.connectors?.length ?? 0), 0);
console.log(
  `data ok: ${stationCount} stations (${connectorCount} connector groups) across ${stationNetworks.size} networks, ` +
    `${tariffsDoc.networks.length} tariff entries, updated ${stationsDoc.updatedAt}`,
);
