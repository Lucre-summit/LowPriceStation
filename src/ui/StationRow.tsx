import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RankedStation } from "../domain/rank";
import { formatClock, formatDistanceKm, formatSessionCost, formatUnitPrice } from "./format";
import { strings } from "./strings";
import { colors, radius, spacing } from "./theme";

/** One station: what it costs this driver, when they would get there, and how much to trust the price. */
export function StationRow({ item, onPress }: { item: RankedStation; onPress: () => void }) {
  const cost = formatSessionCost(item.price?.sessionCostThb ?? null);
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.name} numberOfLines={1}>
          {item.station.name}
        </Text>
        <Text style={cost ? styles.cost : styles.costUnknown}>{cost ?? strings.unknownPrice}</Text>
      </View>
      <Text style={styles.meta}>
        {`${item.station.network} · ${formatDistanceKm(item.distanceKm)} · ${strings.arrivalPrefix}${formatClock(item.arrival)}`}
      </Text>
      <View style={styles.foot}>
        <Text style={item.price ? styles.unit : styles.unitUnknown}>{formatUnitPrice(item.price)}</Text>
        {item.stalePrice ? <Text style={styles.stale}>{strings.staleWarning}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.xs },
  head: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, alignItems: "center" },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  cost: { fontSize: 17, fontWeight: "700", color: colors.accent },
  costUnknown: { fontSize: 14, color: colors.warn },
  meta: { fontSize: 13, color: colors.muted },
  foot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  unit: { fontSize: 14, fontWeight: "600", color: colors.text },
  unitUnknown: { fontSize: 14, color: colors.muted },
  stale: { fontSize: 12, color: colors.warn },
});
