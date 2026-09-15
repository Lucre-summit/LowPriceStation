# Builds data/stations.th.json from the two retrieved public datasets.
#
# Sources (kept in data/raw/ for traceability):
#   - PEA VOLTA station file, sheet "PEA VOLTA 409 (เปิดแล้ว)", published May 2024
#   - Bangkok Metropolitan Administration ArcGIS layer of charging stations
#
# Rules that keep the output honest:
#   - Only the five networks in scope are imported; every other provider is counted and skipped.
#   - Only stations with at least one DC connector (CCS2 or CHAdeMO) are imported.
#   - A station is the same as another when it shares a network and sits within 50 m; merges keep every source id.
#   - Where a source gives several power bands for one standard and cannot split them across connectors,
#     the highest band is used and the station is noted: PEA prices higher bands higher, so this never
#     overstates how cheap a station is.
#   - Prices are never written here. They live in data/tariffs.th.json, curated from published rate cards.
#
# Run: python scripts/import-pea-bma.py

import collections
import json
import math
import re
import unicodedata
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "stations.th.json"

PEA_XLSX = RAW / "PEA_VOLTA_May_2024.xlsx"
BMA_JSON = RAW / "bma_arcgis_dcevbmA_chargingstation.json"

METRO_PROVINCES = {"กทม.", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "สมุทรสาคร", "นครปฐม"}
BANDS = [25, 50, 120, 300, 360]

# ArcGIS PROVIDER values that belong to a network in scope. Anything else is counted and skipped.
PROVIDER_TO_NETWORK = {
    "PEA": "PEA VOLTA",
    "PTT": "EV Station PluZ",
    "EleX": "EleX by EGAT",
    "MEA": "MEA EV",
    "EA-24 Hr": "EA Anywhere",
    "EA-Peak": "EA Anywhere",
    "EA-Off Peak": "EA Anywhere",
}
NETWORK_SLUG = {
    "PEA VOLTA": "pea-volta",
    "EV Station PluZ": "pluz",
    "EleX by EGAT": "elex",
    "MEA EV": "mea",
    "EA Anywhere": "ea",
}


def clean(value):
    if value is None:
        return None
    text = unicodedata.normalize("NFC", str(value)).replace("\u00a0", " ").strip()
    return re.sub(r"\s+", " ", text) or None


def in_thailand(lat, lng):
    return isinstance(lat, float) and isinstance(lng, float) and 5.6 < lat < 20.5 and 97.3 < lng < 105.7


def pea_stations():
    workbook = openpyxl.load_workbook(PEA_XLSX, data_only=True)
    sheet = workbook["PEA VOLTA 409 (เปิดแล้ว)"]
    header = list(next(sheet.iter_rows(min_row=4, max_row=4, values_only=True)))
    column = {name: index for index, name in enumerate(header) if name}
    rows = list(sheet.iter_rows(min_row=5, max_row=415, values_only=True))

    stations, skipped = [], collections.Counter()
    for row in rows:
        if row[0] is None:
            continue
        province = clean(row[column["จังหวัด"]])
        if province not in METRO_PROVINCES:
            skipped["outside metro"] += 1
            continue
        try:
            lat = float(row[column["ละติดจูด"]])
            lng = float(row[column["ลองติดจูด"]])
        except (TypeError, ValueError):
            skipped["no coordinates"] += 1
            continue
        if not in_thailand(lat, lng):
            skipped["coordinates outside Thailand"] += 1
            continue

        present = [kw for kw in BANDS if int(row[column[f"{kw}kW"]] or 0) > 0]
        ccs2 = int(row[column["CCS2"]] or 0)
        chademo = int(row[column["CHAdeMO"]] or 0)
        type2 = int(row[column["AC Type 2"]] or 0)
        if ccs2 == 0 and chademo == 0:
            skipped["no DC connector"] += 1
            continue

        top = max(present) if present else 50
        connectors = []
        for standard, count in (("CCS2", ccs2), ("CHAdeMO", chademo), ("Type 2", type2)):
            if count:
                connectors.append(
                    {"standard": standard, "maxPowerKw": 22 if standard == "Type 2" else top, "count": count}
                )

        notes = None
        if len(present) > 1:
            bands_text = ", ".join(f"{kw} kW" for kw in present)
            notes = f"PEA file lists several power bands here ({bands_text}); the highest is carried on the connector"

        stations.append(
            {
                "id": f"pea-volta-{int(row[0]):04d}",
                "name": clean(row[column["ชื่อสถานี PEA ภาษาไทย"]]) or "PEA VOLTA station",
                "network": "PEA VOLTA",
                "position": {"lat": round(lat, 6), "lng": round(lng, 6)},
                "connectors": connectors,
                "address": ", ".join(part for part in (clean(row[column["อำเภอ"]]), province) if part) or None,
                "openingHours": None,
                "notes": notes,
                "sourceIds": [{"source": "pea-xlsx", "id": str(row[0])}],
            }
        )
    return stations, skipped


def bma_connectors(attributes):
    """Connectors from an ArcGIS description such as '2x CCS2: 160 kW, Type2: 11 kW'."""
    description = clean(attributes.get("DESCRIPTION")) or ""
    power_match = re.search(r"(\d+)\s*kW", clean(attributes.get("POWER")) or "")
    fallback_power = int(power_match.group(1)) if power_match else None

    connectors = []
    ccs2_count = 0
    ccs2_power = 0
    for match in re.finditer(r"(?:(\d+)\s*x\s*)?CCS2\s*:?\s*(?:(\d+)\s*kW)?", description, re.IGNORECASE):
        count = int(match.group(1)) if match.group(1) else 1
        power = int(match.group(2)) if match.group(2) else None
        if power is None:
            # 'StarCharge Jupiter120: 2x CCS2 (1000V 200A)' carries its power in the model name or the POWER field.
            model = re.search(r"([A-Za-z]+)(\d{2,3})\b", description[max(0, match.start() - 40) : match.start()])
            power = int(model.group(2)) if model else fallback_power
        if power is not None and 20 <= power <= 400:
            ccs2_count += count
            ccs2_power = max(ccs2_power, power)
    if ccs2_count:
        connectors.append({"standard": "CCS2", "maxPowerKw": ccs2_power, "count": ccs2_count})

    chademo = re.search(r"(?:(\d+)\s*x\s*)?CHAdeMO\s*:?\s*(?:(\d+)\s*kW)?", description, re.IGNORECASE)
    if chademo:
        count = int(chademo.group(1)) if chademo.group(1) else 1
        power = int(chademo.group(2)) if chademo.group(2) else (fallback_power or 50)
        connectors.append({"standard": "CHAdeMO", "maxPowerKw": power, "count": count})

    type2 = re.findall(r"(\d+)?\s*x?\s*Type\s?2\s*:?\s*(?:(\d+)\s*kW)?", description, re.IGNORECASE)
    type2_count = sum(int(count) if count else 1 for count, _ in type2)
    if type2_count:
        powers = [int(power) for _, power in type2 if power]
        connectors.append({"standard": "Type 2", "maxPowerKw": max(powers) if powers else 22, "count": type2_count})
    return connectors


def bma_stations():
    payload = json.loads(BMA_JSON.read_text(encoding="utf-8"))
    stations, skipped = [], collections.Counter()
    for feature in payload["features"]:
        attributes = feature["attributes"]
        provider = clean(attributes.get("PROVIDER"))
        if provider == "EA-Closed":
            skipped["EA sites the layer records as closed"] += 1
            continue
        network = PROVIDER_TO_NETWORK.get(provider or "")
        if network is None:
            skipped[f"provider out of scope: {provider}"] += 1
            continue
        lat, lng = attributes.get("LATITUDE"), attributes.get("LONGITUDE")
        if not in_thailand(lat, lng):
            skipped["no usable coordinates"] += 1
            continue
        connectors = bma_connectors(attributes)
        if not any(connector["standard"] in ("CCS2", "CHAdeMO") for connector in connectors):
            skipped["no DC connector"] += 1
            continue
        object_id = attributes.get("OBJECTID") or attributes.get("FID") or attributes.get("GLOBALID")
        stations.append(
            {
                "id": None,  # numbered after merging
                "name": clean(attributes.get("NAME_T")) or clean(attributes.get("NAME_E")) or f"{network} station",
                "network": network,
                "position": {"lat": round(float(lat), 6), "lng": round(float(lng), 6)},
                "connectors": connectors,
                "address": clean(attributes.get("ADDRESS")),
                "openingHours": clean(attributes.get("HOURS")) or None,
                "notes": clean(attributes.get("DESCRIPTION")),
                "sourceIds": [{"source": "bma-arcgis", "id": str(object_id)}],
            }
        )
    return stations, skipped


def metres_between(a, b):
    dlat = (b["lat"] - a["lat"]) * 111_320
    dlng = (b["lng"] - a["lng"]) * 111_320 * math.cos(math.radians((a["lat"] + b["lat"]) / 2))
    return math.hypot(dlat, dlng)


def merge_duplicates(stations):
    """Same network and within 50 m is one station; source ids and connector counts are unioned."""
    merged, merges = [], 0
    for station in stations:
        twin = next(
            (
                kept
                for kept in merged
                if kept["network"] == station["network"] and metres_between(kept["position"], station["position"]) <= 50
            ),
            None,
        )
        if twin is None:
            merged.append(station)
            continue
        merges += 1
        twin["sourceIds"].extend(station["sourceIds"])
        for connector in station["connectors"]:
            existing = next((c for c in twin["connectors"] if c["standard"] == connector["standard"]), None)
            if existing is None:
                twin["connectors"].append(connector)
            else:
                existing["count"] += connector["count"]
                existing["maxPowerKw"] = max(existing["maxPowerKw"], connector["maxPowerKw"])
        if station["notes"] and station["notes"] not in (twin["notes"] or ""):
            twin["notes"] = "; ".join(filter(None, [twin["notes"], station["notes"]]))
    for network, slug in NETWORK_SLUG.items():
        counter = 0
        for station in merged:
            if station["network"] == network:
                counter += 1
                station["id"] = f"{slug}-{counter:04d}"
    return merged, merges


def main():
    pea, pea_skipped = pea_stations()
    bma, bma_skipped = bma_stations()
    stations, merges = merge_duplicates(pea + bma)

    per_network = collections.Counter(station["network"] for station in stations)
    with_ccs2 = sum(1 for station in stations if any(c["standard"] == "CCS2" for c in station["connectors"]))
    document = {"version": 1, "updatedAt": "2026-09-15", "stations": stations}
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"wrote {OUT.relative_to(ROOT)} with {len(stations)} stations ({with_ccs2} with CCS2)")
    print("per network:", dict(per_network))
    print("merged as duplicates:", merges)
    print("PEA skipped:", dict(pea_skipped))
    print("BMA skipped:", dict(sorted(bma_skipped.items(), key=lambda kv: -kv[1])[:10]))


if __name__ == "__main__":
    main()
