// Where the two buttons on a station lead to. Kept apart from the screen so the URLs can be
// pinned against the vendors' own documented formats, and so each platform is dispatched once.
import type { LatLng, NetworkAppLinks } from "./types";

export type HandoffPlatform = "android" | "ios" | "web";

const PLATFORM_BY_OS: Record<string, HandoffPlatform> = { android: "android", ios: "ios" };

/** Which handoff flavour this runtime gets: the two mobile ones, and the web fallback for anything else. */
export function platformFor(os: string): HandoffPlatform {
  return PLATFORM_BY_OS[os] ?? "web";
}

const NAVIGATION_URL: Record<HandoffPlatform, (destination: string) => string> = {
  android: (destination) => `google.navigation:q=${destination}&mode=d`,
  ios: (destination) => `https://maps.apple.com/directions?destination=${destination}&mode=driving`,
  web: (destination) => `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
};

const STORE_SEARCH_URL: Record<HandoffPlatform, (query: string) => string> = {
  android: (query) => `https://play.google.com/store/search?q=${query}&c=apps`,
  ios: (query) => `https://apps.apple.com/search?term=${query}`,
  web: (query) => `https://play.google.com/store/search?q=${query}&c=apps`,
};

const LINK_FOR_PLATFORM: Record<HandoffPlatform, (links: NetworkAppLinks) => string | null | undefined> = {
  android: (links) => links.android,
  ios: (links) => links.ios,
  web: (links) => links.web ?? links.android,
};

/**
 * Turn-by-turn starts in the platform's own map app, which is also what ADR-0002 settled on.
 * The https form is kept behind it: the `google.navigation:` scheme is handled only by Google Maps,
 * so a handset without it would otherwise get a tap that does nothing.
 */
export function navigationCandidates(platform: HandoffPlatform, position: LatLng): string[] {
  const destination = `${position.lat},${position.lng}`;
  const platformUrl = NAVIGATION_URL[platform](destination);
  if (platform === "web") return [platformUrl];
  return [platformUrl, NAVIGATION_URL.web(destination)];
}

/**
 * The network's own app where a verified link is known, then the store's search for its name —
 * a search still lands the driver one tap from installing, without inventing package ids.
 */
export function networkAppCandidates(
  platform: HandoffPlatform,
  network: string,
  links: NetworkAppLinks | null | undefined,
): string[] {
  const search = STORE_SEARCH_URL[platform](encodeURIComponent(network));
  const known = links ? LINK_FOR_PLATFORM[platform](links) : null;
  return known && known !== search ? [known, search] : [search];
}
