# Price is a structured, effective-dated tariff, not one number per station

Thai networks price charging by power band, time-of-day window and site, in four different units (THB/kWh, THB/hour, THB/minute, plus an idle fee), so a single "price per station" would be wrong or misleading: the same station can legitimately be cheaper or dearer than another depending on when the driver arrives and which connector they use. We therefore model price as tariff records keyed by network, connector, power band, TOU window and site override, each carrying the date it takes effect, the date it was last checked, and the source it came from; the app shows the record that applies to the driver's expected arrival time.

## Considered options

- One price per station (what existing apps do): rejected — cannot express power bands, TOU windows or site overrides, and yields confidently wrong rankings.
- Storing only the raw published wording: rejected — nothing to compare, filter or rank.

## Consequences

Comparing prices at connector level requires knowing the car's connector standard and the energy it needs, so the app needs a vehicle profile.
