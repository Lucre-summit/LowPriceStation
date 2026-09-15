# Navigation is handed off to Google/Apple Maps rather than built in-app

The station screen's navigation button opens the platform map app at the station's coordinates (`google.navigation:` intent on Android, a `maps.apple.com` or `google.com/maps` URL elsewhere) instead of rendering turn-by-turn guidance ourselves. This costs nothing per use, needs no background location permission, and sidesteps Google's Maps terms, which forbid assembling a navigation experience substantially similar to Google Maps out of the Directions API plus the Maps SDK.

## Considered options

- In-app turn-by-turn: Routes API at $5–15 per 1,000 requests plus SDK integration, with the terms clause above as a standing suspension risk. Worth revisiting only if charge-aware routing mid-drive becomes a requirement — and then on an EV-aware provider (HERE/TomTom) rather than Google.

## Consequences

Any travel time used for ranking or for arrival-time tariffs must come from a separate, deliberately small routing call, not from the navigation experience itself.
