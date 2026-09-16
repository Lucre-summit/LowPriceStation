import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Chip } from "./Chip";
import { strings } from "./strings";
import { colors, radius, spacing } from "./theme";
import type { SortOrder } from "./types";

const RADII = [5, 10, 25];
const POWERS = [0, 50, 100];

export interface ControlsProps {
  sort: SortOrder;
  onSort: (sort: SortOrder) => void;
  radiusKm: number;
  onRadius: (km: number) => void;
  minPowerKw: number;
  onMinPower: (kw: number) => void;
  networks: string[];
  network: string | null;
  onNetwork: (network: string | null) => void;
  energyOverrideKwh: number | null;
  onEnergyOverride: (kwh: number | null) => void;
  profileLabel: string;
  onEditProfile: () => void;
  resultCount: number;
}

/** Sorting, the filters that decide which stations are eligible, and the session energy override. */
export function Controls(props: ControlsProps) {
  const [overrideText, setOverrideText] = useState(
    props.energyOverrideKwh == null ? "" : String(props.energyOverrideKwh),
  );

  const commitOverride = (text: string) => {
    setOverrideText(text);
    const value = Number(text.trim());
    props.onEnergyOverride(text.trim() === "" || !Number.isFinite(value) || value <= 0 ? null : value);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.line}>
        <Chip label={strings.sortCheapest} selected={props.sort === "cheapest"} onPress={() => props.onSort("cheapest")} />
        <Chip label={strings.sortNearest} selected={props.sort === "nearest"} onPress={() => props.onSort("nearest")} />
        <Text style={styles.count}>{`${props.resultCount}${strings.countSuffix}`}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollLine}>
        {RADII.map((km) => (
          <Chip
            key={km}
            label={`${km}${strings.radiusSuffix}`}
            selected={props.radiusKm === km}
            onPress={() => props.onRadius(km)}
          />
        ))}
        {POWERS.map((kw) => (
          <Chip
            key={kw}
            label={kw === 0 ? strings.anyPower : `${strings.minPowerPrefix}${kw}${strings.minPowerSuffix}`}
            selected={props.minPowerKw === kw}
            onPress={() => props.onMinPower(kw)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollLine}>
        <Chip
          label={strings.allNetworks}
          selected={props.network === null}
          onPress={() => props.onNetwork(null)}
        />
        {props.networks.map((network) => (
          <Chip
            key={network}
            label={network}
            selected={props.network === network}
            onPress={() => props.onNetwork(network)}
          />
        ))}
      </ScrollView>

      <View style={styles.line}>
        <Text style={styles.overrideLabel}>{strings.energyToAdd}</Text>
        <TextInput
          style={styles.overrideInput}
          value={overrideText}
          onChangeText={commitOverride}
          keyboardType="numeric"
          placeholder={strings.energyPlaceholder}
          placeholderTextColor={colors.faint}
        />
        <Text style={styles.overrideUnit}>{strings.energyUnit}</Text>
        {props.energyOverrideKwh != null ? (
          <Chip
            label={strings.useProfileValues}
            selected={false}
            onPress={() => {
              setOverrideText("");
              props.onEnergyOverride(null);
            }}
          />
        ) : null}
      </View>

      <Pressable onPress={props.onEditProfile} style={styles.profileButton}>
        <Text style={styles.profileButtonText}>{`${strings.profileButtonPrefix}${props.profileLabel}`}</Text>
        <Text style={styles.profileButtonHint}>{strings.edit}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm, paddingBottom: spacing.sm },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  scrollLine: { flexDirection: "row", gap: spacing.sm, paddingRight: spacing.md },
  count: { marginLeft: "auto", fontSize: 13, color: colors.muted },
  overrideLabel: { fontSize: 13, color: colors.muted },
  overrideInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  overrideUnit: { fontSize: 13, color: colors.muted },
  profileButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileButtonText: { fontSize: 14, color: colors.text, fontWeight: "600" },
  profileButtonHint: { fontSize: 13, color: colors.accent },
});
