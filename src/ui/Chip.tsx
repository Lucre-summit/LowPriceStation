import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, spacing } from "./theme";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** One selectable option in the filter and sort rows, and the only place chip styling lives. */
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: colors.chipIdle,
  },
  chipSelected: { backgroundColor: colors.chipSelected },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { fontSize: 13, color: colors.chipSelectedText, fontWeight: "600" },
});
