import { Pressable, StyleSheet, Text } from "react-native";

import { strings } from "./strings";
import { colors } from "./theme";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
}

/** The heart, in one place, so the list and the detail screen cannot drift apart. */
export function FavoriteButton({ isFavorite, onToggle, size = 22 }: FavoriteButtonProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityLabel={isFavorite ? strings.favoriteRemove : strings.favoriteAdd}
      hitSlop={8}
    >
      <Text style={[styles.heart, { fontSize: size }, isFavorite ? styles.on : styles.off]}>
        {isFavorite ? "♥" : "♡"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heart: { lineHeight: 26 },
  on: { color: colors.accent },
  off: { color: colors.faint },
});
