# Price data is curated by hand, because no structured feed exists

We verified that no public source exposes structured per-kWh prices for Thai charging stations: Open Charge Map's cost field is free text and covers only 52 Thai stations, Google Places has no price field at all, no Thai network publishes a price API, and the government datasets carry no price column. Paid feeds (TomTom EV Search, HERE EV Charge Points v3) do carry structured tariff components, but both are sales-gated, and TomTom's Thai dynamic layer is blank, so v1 does not pay for them. The price layer is therefore a hand-curated dataset keyed to the tariff model in ADR-0001, encoded from the networks' published rate cards and site notices, with `source_url`, `checked_at` and `effective_from` on every record.

## Considered options

- Scraping operator apps or sites: rejected — several terms forbid it outright (e.g. EA Anywhere clause 2.2(5)) and scrapers break silently when a site changes.
- Open Charge Map as the price layer: rejected — free text, and 52 Thai stations is far too thin a base.
- Google Places: rejected — no price field, and storing its content beyond 30 days breaches its terms.
- Paid EV feeds: deferred, not rejected — revisit when coverage justifies a sales conversation.

## Consequences

Price coverage and freshness are a content operation rather than an engineering feature: coverage grows network by network, and every rate needs a human to read a rate card and encode it under the tariff model.
