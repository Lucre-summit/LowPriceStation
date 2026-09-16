import { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
// MapLibre positions its canvas and markers through its own stylesheet: without it the markers
// fall into normal flow and the map box grows to the height of every pin.
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatStationHeadline } from "../format";
import { colors, radius, spacing } from "../theme";
import { boundsOf } from "./bounds";
import { TILE_ATTRIBUTION, TILE_URL_TEMPLATE, type StationMapProps } from "./types";

/**
 * The map on the web build, drawn by MapLibre GL. The native build uses StationMap.native.tsx,
 * and this file is only ever bundled for web, which is why maplibre-gl is imported statically.
 */
export function StationMap({ entries, origin, onSelect }: StationMapProps) {
  const host = useRef<View | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    // react-native-web renders this View as a div, which is what MapLibre takes as its container.
    const container = host.current as unknown as HTMLElement;
    const map = new MapLibreMap({
      container,
      center: [origin.lng, origin.lat],
      zoom: 12,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [TILE_URL_TEMPLATE],
            tileSize: 256,
            attribution: TILE_ATTRIBUTION,
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    mapRef.current = map;
    // MapLibre measures its container once at creation; in a flex layout that measurement can
    // predate the final size, which puts every marker outside the visible box. Re-measure on the
    // next frame and whenever the box actually changes.
    const resize = () => map.resize();
    const frame = requestAnimationFrame(resize);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [origin.lat, origin.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = entries.map((entry) => {
      const label = document.createElement("div");
      const headline = formatStationHeadline(entry);
      label.textContent = headline.text;
      Object.assign(label.style, {
        padding: `${spacing.xs}px ${spacing.sm}px`,
        borderRadius: `${radius.chip}px`,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        color: headline.emphasized ? colors.accent : colors.warn,
        font: "600 12px system-ui, sans-serif",
        whiteSpace: "nowrap",
        cursor: "pointer",
      });
      label.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(entry);
      });
      return new MapLibreMarker({ element: label })
        .setLngLat([entry.station.position.lng, entry.station.position.lat])
        .addTo(map);
    });

    const driver = document.createElement("div");
    Object.assign(driver.style, {
      width: "12px",
      height: "12px",
      borderRadius: "6px",
      background: colors.text,
      border: `2px solid ${colors.surface}`,
    });
    markersRef.current.push(new MapLibreMarker({ element: driver }).setLngLat([origin.lng, origin.lat]).addTo(map));

    const bounds = boundsOf(entries);
    if (bounds) {
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 56, duration: 0, maxZoom: 14 },
      );
    }
  }, [entries, origin, onSelect]);

  return (
    <View style={styles.canvas}>
      <View ref={host} style={styles.map} />
      <Text style={styles.attribution}>{TILE_ATTRIBUTION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, borderRadius: radius.card, overflow: "hidden" },
  map: { flex: 1 },
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
