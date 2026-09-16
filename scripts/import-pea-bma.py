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
from datetime import date
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "stations.th.json"

PEA_XLSX = RAW / "PEA_VOLTA_May_2024.xlsx"
BMA_JSON = RAW / "bma_arcgis_dcevbmA_chargingstation.json"

BANDS = [25, 50, 120, 300, 360]

# The PEA sheet marks a corrected row with this word in place of its ลำดับ.
REPLACEMENT = re.compile(r"^replace$", re.IGNORECASE)

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


def pea_connectors(counts, type2, ccs2, chademo):
    """Connector groups for one PEA row, carrying the highest band it lists.

    A row that lists several bands cannot split them across connectors, and PEA prices higher
    bands higher, so the highest is used and the row is noted: this never overstates cheapness.
    """
    present = [kw for kw in BANDS if counts.get(kw, 0) > 0]
    top = max(present) if present else 50
    connectors = []
    for standard, count in (("CCS2", ccs2), ("CHAdeMO", chademo), ("Type 2", type2)):
        if count:
            connectors.append(
                {"standard": standard, "maxPowerKw": 22 if standard == "Type 2" else top, "count": count}
            )
    return connectors, present


def pea_stations():
    # PEA publishes its whole network in one file, so it is imported nationwide: a driver outside
    # Bangkok still gets real stations and real PEA prices. The ArcGIS layer below is Bangkok-only.
    workbook = openpyxl.load_workbook(PEA_XLSX, data_only=True)
    sheet = workbook["PEA VOLTA 409 (เปิดแล้ว)"]
    header = list(next(sheet.iter_rows(min_row=4, max_row=4, values_only=True)))
    column = {name: index for index, name in enumerate(header) if name}

    stations, skipped = [], collections.Counter()
    for sheet_row, row in enumerate(sheet.iter_rows(min_row=5, max_row=415, values_only=True), start=5):
        if row[0] is None:
            continue
        sequence = str(row[0]).strip()
        name = clean(row[column["ชื่อสถานี PEA ภาษาไทย"]]) or "PEA VOLTA station"

        try:
            position = {
                "lat": round(float(row[column["ละติดจูด"]]), 6),
                "lng": round(float(row[column["ลองติดจูด"]]), 6),
            }
        except (TypeError, ValueError):
            skipped["no coordinates"] += 1
            continue
        if not in_thailand(position["lat"], position["lng"]):
            skipped["coordinates outside Thailand"] += 1
            continue

        province = clean(row[column["จังหวัด"]])
        if province and re.search(r"\d", province):
            # One row carries an office code (กฟก.2) in the province column; keep the district only.
            province = None

        counts = {kw: int(row[column[f"{kw}kW"]] or 0) for kw in BANDS}
        type2 = int(row[column["AC Type 2"]] or 0)
        ccs2 = int(row[column["CCS2"]] or 0)
        chademo = int(row[column["CHAdeMO"]] or 0)
        if ccs2 == 0 and chademo == 0:
            skipped["no DC connector"] += 1
            continue

        connectors, present = pea_connectors(counts, type2, ccs2, chademo)
        notes = None
        if len(present) > 1:
            bands_text = ", ".join(f"{kw} kW" for kw in present)
            notes = f"PEA file lists several power bands here ({bands_text}); the highest is carried on the connector"

        if REPLACEMENT.match(sequence):
            # The sheet marks a corrected row with the word "replace" instead of a ลำดับ: it
            # supersedes the earlier row for the same site rather than adding a station.
            target = next(
                (
                    kept
                    for kept in stations
                    if kept["key"] == re.sub(r"\s*#\d+\s*$", "", name).strip()
                    or metres_between(kept["position"], position) <= 50
                ),
                None,
            )
            if target is not None:
                target["connectors"] = connectors
                target["position"] = position
                target["notes"] = " ".join(
                    filter(None, [target["notes"], f"row {sheet_row} marked replace supersedes row {target['sourceIds'][0]['id']}"])
                )
                skipped["rows marked replace (superseding an earlier row)"] += 1
                continue
            notes = " ".join(filter(None, [notes, f"row {sheet_row} is marked replace with no earlier row to supersede"]))

        stations.append(
            {
                "id": None,  # derived from the site itself once duplicates are merged
                "key": re.sub(r"\s*#\d+\s*$", "", name).strip(),
                "name": name,
                "network": "PEA VOLTA",
                "position": position,
                "connectors": connectors,
                "address": ", ".join(part for part in (clean(row[column["อำเภอ"]]), province) if part) or None,
                "openingHours": None,
                "notes": notes,
                "sourceIds": [
                    {"source": "pea-xlsx", "id": sequence if not REPLACEMENT.match(sequence) else f"row-{sheet_row}"}
                ],
            }
        )

    for station in stations:
        station.pop("key", None)
    return stations, skipped


def bma_connectors(attributes):
    """Connectors from an ArcGIS description such as '2x CCS2: 160 kW, Type2: 11 kW'.

    Segments the description on commas because the layer marks individual connectors as CLOSED,
    and a connector that is closed is not a connector a driver can use.
    """
    description = clean(attributes.get("DESCRIPTION")) or ""
    power_match = re.search(r"(\d+)\s*kW", clean(attributes.get("POWER")) or "")
    fallback_power = int(power_match.group(1)) if power_match else None

    segments = [segment.strip() for segment in description.split(",")]
    standard_alt = r"(?:CCS2|CHAdeMO|Type\s?2|Type\s?1)"
    standard_token = re.compile(standard_alt, re.IGNORECASE)
    groups = []
    for segment in segments:
        if not segment:
            continue
        if standard_token.search(segment):
            groups.append([segment])
        elif groups:
            # A trailing token belongs to the connector group above it, including a bare CLOSED marker.
            groups[-1].append(segment)

    totals = {"CCS2": 0, "CHAdeMO": 0, "Type 2": 0}
    powers = {"CCS2": 0, "CHAdeMO": 0, "Type 2": 0}

    for group in groups:
        text = ", ".join(group)
        if "CLOSED" in text.upper():
            continue
        standard = None
        for candidate, pattern in (("CCS2", r"CCS2"), ("CHAdeMO", r"CHAdeMO"), ("Type 2", r"Type\s?2")):
            if re.search(pattern, group[0], re.IGNORECASE):
                standard = candidate
                break
        if standard is None:
            continue
        count = 1
        count_match = re.search(rf"(\d+)\s*x\s*{standard_alt}", text, re.IGNORECASE) or re.search(
            rf"{standard_alt}\s*:?\s*(\d+)\s*x", text, re.IGNORECASE
        )
        if count_match:
            count = int(count_match.group(1))
        kw_match = re.search(r"(\d+)\s*kW", text)
        power = int(kw_match.group(1)) if kw_match else None
        if power is None and standard != "Type 2":
            model = re.search(r"([A-Za-z]+)(\d{2,3})\b", text)
            if model:
                power = int(model.group(2))
        # An AC connector is never priced on the site's DC power; 22 kW is the common Thai Type 2 ceiling.
        power = power or (22 if standard == "Type 2" else fallback_power)
        if power is not None and 5 <= power <= 480:
            totals[standard] += count
            powers[standard] = max(powers[standard], power)

    connectors = []
    for standard in ("CCS2", "CHAdeMO", "Type 2"):
        if totals[standard]:
            connectors.append(
                {"standard": standard, "maxPowerKw": powers[standard], "count": totals[standard]}
            )
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
                "id": None,  # derived from the site itself once duplicates are merged
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
    """Same network and within 50 m is one station; source ids and connector counts are unioned.

    The id is ours and comes from the site itself — the anchor member's coordinates, quantised
    to about ten metres — so it survives a publisher renumbering its sheet, and a saved favorite
    keeps pointing at the same place. Source record numbers stay in sourceIds for traceability.
    """
    merged, merges, cluster_positions = [], 0, []
    for station in stations:
        twin_index = next(
            (
                index
                for index, kept in enumerate(merged)
                if kept["network"] == station["network"] and metres_between(kept["position"], station["position"]) <= 50
            ),
            None,
        )
        if twin_index is None:
            merged.append(station)
            cluster_positions.append([station["position"]])
            continue
        merges += 1
        cluster_positions[twin_index].append(station["position"])
        twin = merged[twin_index]
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

    for station, positions in zip(merged, cluster_positions):
        # The member that sorts first by source is the anchor: quantised to ~10 m it gives an id
        # that a later duplicate row for the same site cannot move, and that a saved favorite
        # keeps pointing at. Source record numbers stay in sourceIds for traceability.
        anchor = min(
            zip(station["sourceIds"], positions),
            key=lambda pair: (pair[0]["source"], str(pair[0]["id"])),
        )[1]
        lat = round(anchor["lat"], 4)
        lng = round(anchor["lng"], 4)
        station["position"] = {"lat": lat, "lng": lng}
        station["id"] = f"{NETWORK_SLUG[station['network']]}-{lat:.4f}-{lng:.4f}"
    return merged, merges


def main():
    pea, pea_skipped = pea_stations()
    bma, bma_skipped = bma_stations()
    stations, merges = merge_duplicates(pea + bma)

    per_network = collections.Counter(station["network"] for station in stations)
    with_ccs2 = sum(1 for station in stations if any(c["standard"] == "CCS2" for c in station["connectors"]))
    document = {"version": 1, "updatedAt": date.today().isoformat(), "stations": stations}
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"wrote {OUT.relative_to(ROOT)} with {len(stations)} stations ({with_ccs2} with CCS2)")
    print("per network:", dict(per_network))
    print("merged as duplicates:", merges)
    print("PEA skipped:", dict(pea_skipped))
    print("BMA skipped:", dict(sorted(bma_skipped.items(), key=lambda kv: -kv[1])[:10]))


if __name__ == "__main__":
    main()
