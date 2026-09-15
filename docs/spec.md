# LowPriceStation — v1 spec

Ready to publish to the issue tracker (`Lucre-summit/LowPriceStation`) with the `ready-for-agent` label.

## Problem Statement

A driver in Thailand who needs to charge on the road cannot tell which nearby station is cheapest. Every network prices differently — by power band, by time of day, by site, in units of kWh, hours, or minutes, plus idle fees — and no app compares prices across networks. Operators' own apps show one network each; Google Places has no price field; PlugShare carries price only as free text on some stations. So the driver opens several apps, guesses, or overpays. The spread is real: a 36 kWh session costs 176 THB at the cheapest published DC rate and 324 THB at the dearest — the same charge, nearly twice the money.

## Solution

An app that lists DC charging stations near the driver, ranked by the estimated cost of the actual session the driver needs, using a curated and effective-dated tariff database rather than a live price feed (none exists). Each station opens to the tariff components that apply to that driver at that arrival time, the connector and power available, when the price was last checked, which network app must be used to start the charge, a navigation handoff, and a favorite toggle. Prices ship as a versioned data document fetched at launch, so a rate change is a data edit, not an app release.

## User Stories

1. As a driver in an unfamiliar district, I want the cheapest DC stations near me listed first, so that I do not overpay for a charge.
2. As a driver, I want the list ordered by estimated session cost, so that the ranking matches what I will actually pay.
3. As a driver charging late in the evening, I want off-peak rates applied for my expected arrival time, so that the estimate reflects the network's time-of-use window.
4. As a driver with a 60 kWh car charging from 20% to 80%, I want the estimate computed from the 36 kWh I actually need, so that stations are comparable.
5. As a driver who only needs a partial top-up, I want to override the energy to add for one session, so that the estimate matches this trip.
6. As a driver whose car uses CCS2, I want only compatible connectors considered, so that I am never sent to a plug I cannot use.
7. As a driver, I want to restrict results to a 5, 10 or 25 km radius, so that distant stations do not top the list.
8. As a driver in a hurry, I want to require a minimum charging power, so that slow chargers are filtered out.
9. As a driver who already holds one network's account, I want to filter by network, so that I can use the account I have.
10. As a driver, I want to switch between cheapest-first and nearest-first, so that I can choose cost or convenience.
11. As a driver scanning the list, I want each row to show the applicable unit price and the distance, so that I can judge without opening it.
12. As a driver, I want to see when a station's price was last checked, so that I know how far to trust it.
13. As a driver looking at a stale record, I want an explicit "may be out of date" badge, so that I am not misled.
14. As a driver, I want stations whose price is unknown listed last and labelled as unknown, so that I never see a guessed price.
15. As a driver opening a station, I want the tariff components that apply to me — power band, time-of-use window, idle fee and its grace period — so that I can plan the stop.
16. As a driver, I want to know the idle fee and grace period before I arrive, so that I am not billed for overstaying.
17. As a driver, I want to see connector standard, power, number of guns and opening hours, so that I can judge whether the station works for me right now.
18. As a driver, I want to see which network app I must use to start the charge, so that I am not stranded at the plug.
19. As a driver, I want a button that opens that network's app, or its store page when it is not installed, so that I can start charging without hunting.
20. As a driver, I want a navigation button that opens Google or Apple Maps at the station, so that I can drive there immediately.
21. As a driver, I want to favorite a station with one tap, so that I can find it again.
22. As a driver, I want my favorites listed with distance and price, so that I can pick quickly next time.
23. As a driver, I want favorites and my vehicle profile to stay on my phone, so that I need no account.
24. As a driver with no signal in a car park, I want the cached list and station details to keep working, so that I can still reach a charger.
25. As a driver who denies location permission, I want to choose an area manually, so that the app remains usable.
26. As a driver opening the app, I want the newest price document fetched silently, so that corrections reach me without an app update.
27. As a driver, I want the app in Thai, so that the labels match how Thai stations and rate cards read.
28. As a driver, I want two records for the same site merged into one, so that prices never appear to contradict each other.
29. As a driver, I want a map view of the same results, so that I can choose by area.
30. As the person entering data, I want every rate to carry its source URL, effective date and last-checked date, so that I can re-verify it quickly.
31. As the person entering data, I want malformed data rejected by a validator, so that a broken file never reaches the app.
32. As the person entering data, I want to correct a price by editing one file, so that I never rebuild the app to fix a number.

## Implementation Decisions

- **Stack**: Expo (React Native) with TypeScript, built through EAS so Android and iOS both ship from a Windows machine. Thai-first UI with strings held in translation files.
- **Price model**: tariff records keyed by network, connector, power band, time-of-use window and site override, each carrying `effective_from`, `checked_at` and `source_url`. See ADR-0001. A station's displayed price is the record that applies to the driver's expected arrival time.
- **Ranking**: estimated session cost = energy to add × applicable unit price, plus any time-based component, with the idle fee surfaced as a warning rather than folded into the number. Unknown prices never rank above known ones and are never guessed.
- **Distance and time**: straight-line distance filters the radius; a deliberately small routing call (Routes API Essentials) supplies travel time only when the detail screen is opened or when results are sorted by arrival time, cached per station.
- **Vehicle profile**: connector standard, battery capacity in kWh, and the state-of-charge range the driver charges within; a per-session override for the energy to add. Defaults to CCS2 and 30 kWh until set.
- **Data delivery**: a versioned JSON document, separate from app code, fetched at launch and cached for offline reading, with `version` and `updated_at`. Hosted so the app needs no credentials to read it.
- **Station identity**: our own stable station id, with all source ids retained; records merge when they share a network and sit within 50 m of each other, and conflicting merges are resolved by hand.
- **Favorites**: device-local only, keyed so a future sync can adopt them without migration.
- **Navigation**: handoff to the platform map app, per ADR-0002; no in-app turn-by-turn.
- **Coverage**: DC (CCS2) only, Bangkok metropolitan area first, across PEA VOLTA, EV Station PluZ, EleX by EGAT, MEA EV and EA Anywhere.
- **Curation**: owned by the maintainer, refreshed monthly and on price announcements; a record whose `checked_at` is older than 90 days is shown as possibly out of date.
- **No backend**: no accounts, no server-side user data, no analytics, no push notifications in v1.

## Testing Decisions

Testing targets external behavior only — what a driver or the data maintainer observes — never internal wiring.

- **Data document validation**: the data file is validated at build time against the tariff schema, so a record missing an effective date, a source URL, or a valid unit is rejected before it can ship. This is the seam where most future breakage will be caught.
- **Ranking**: a pure module takes stations, tariffs, the vehicle profile, a position and an expected arrival time, and returns the ordered result set with the cost breakdown it used. This is the highest seam that covers the product's core promise, and it is where time-of-use windows, unknown prices, idle fees and power-band selection get pinned down.
- **Screens**: smoke coverage that the list renders ranked results and that the detail screen shows the tariff components, the checked date and the two handoff buttons.

Seams are proposed, not settled: confirm them before implementation, since adding a second seam later costs more than choosing it now.

## Out of Scope

AC charging; live occupied/free availability (no public source exists); starting or paying for a charge (no cross-network roaming exists in Thailand); push notifications and price-drop alerts; accounts, sync and multi-device favorites; analytics and crash telemetry; coverage outside Bangkok metropolitan area; paid EV data feeds (TomTom EV Search, HERE EV Charge Points); in-app turn-by-turn navigation; crowdsourced price reports; multiple vehicles per driver.

## Further Notes

- Decisions recorded as ADRs: `docs/adr/0001-price-model-is-a-structured-tariff.md`, `0002-navigation-handoff-not-in-app-guidance.md`, `0003-price-data-is-hand-curated.md`. Vocabulary lives in `CONTEXT.md`.
- Evidence behind the data strategy: `local://ev-th-data-sources.md` and its companions, `local://ev-th-market-pricing.md`, `local://map-stack-costs.md`.
- Prices move often and without notice: PluZ cut rates on 2026-09-01, PEA VOLTA's became effective 2026-05-01, and EA Anywhere's track the Ft tariff. The `checked_at` field and the staleness badge exist because of this, not as decoration.
- Operator terms constrain collection: EA Anywhere forbids data mining outright (clause 2.2(5)) and licenses use as personal and non-commercial only, so scraping is off the table; curated facts from public rate cards are the path.
- Google's Places terms forbid storing its content beyond 30 days and forbid showing it on a non-Google map, which is why the station base is seeded from PEA's public station file, Bangkok's ArcGIS layer and hand entry rather than from Places.
