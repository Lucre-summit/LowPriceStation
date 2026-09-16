import {
  Camera,
  Layer,
  Map,
  Marker,
  RasterSource,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatStationHeadline } from "../format";
import { colors, radius, spacing } from "../theme";
import { boundsOf } from "./bounds";
import { TILE_ATTRIBUTION, TILE_URL_TEMPLATE, type StationMapProps } from "./types";

/** Roughly a couple of kilometres, used only when there is nothing to fit. */
const FALLBACK_SPAN = 0.02;

/** An empty base style: the map draws exactly one raster source and nothing else. */
const BASE_STYLE = { version: 8, sources: {}, layers: [] } satisfies StyleSpecification;

const EDGE_PADDING = 56;

/**
 * The map on Android and iOS, drawn by MapLibre Native from the same raster tiles the web build
 * uses. No Google Maps SDK, so no API key is needed and nothing here depends on Google's terms.
 */
export function StationMap({ entries, origin, onSelect }: StationMapProps) {
  const bounds = boundsOf(entries);
  const cameraBounds: [number, number, number, number] = bounds
    ? [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat]
    : [origin.lng - FALLBACK_SPAN, origin.lat - FALLBACK_SPAN, origin.lng + FALLBACK_SPAN, origin.lat + FALLBACK_SPAN];

  return (
    <View style={styles.canvas}>
      <Map style={styles.map} mapStyle={BASE_STYLE}>
        <Camera
          bounds={cameraBounds}
          padding={{ top: EDGE_PADDING, right: EDGE_PADDING, bottom: EDGE_PADDING, left: EDGE_PADDING }}
        />
        <RasterSource id="osm" tiles={[TILE_URL_TEMPLATE]} tileSize={256}>
          <Layer id="osm-layer" type="raster" />
        </RasterSource>
        <Marker id="driver" lngLat={[origin.lng, origin.lat]}>
          <View style={styles.originDot} />
        </Marker>
        {entries.map((entry) => {
          const headline = formatStationHeadline(entry);
          return (
            <Marker key={entry.station.id} id={entry.station.id} lngLat={[entry.station.position.lng, entry.station.position.lat]}>
              <Pressable onPress={() => onSelect(entry)} style={styles.pin}>
                <Text style={headline.emphasized ? styles.pinCost : styles.pinNote}>{headline.text}</Text>
              </Pressable>
            </Marker>
          );
        })}
      </Map>
      <Text style={styles.attribution}>{TILE_ATTRIBUTION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, borderRadius: radius.card, overflow: "hidden" },
  map: { flex: 1 },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  pin: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pinCost: { fontSize: 12, fontWeight: "600", color: colors.accent },
  pinNote: { fontSize: 12, fontWeight: "600", color: colors.warn },
  attribution: {
    position: "absolute",
    bottom: spacing.xs,
    right: spacing.xs,
    fontSize: 10,
    color: colors.muted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.button,
  },
});
