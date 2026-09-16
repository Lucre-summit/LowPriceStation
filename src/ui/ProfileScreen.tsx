import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { coerceVehicleProfile } from "../data/profile";
import { DEFAULT_VEHICLE, NATIONAL_STANDARDS, type ConnectorStandard, type VehicleProfile } from "../domain/types";
import { Chip } from "./Chip";
import { strings } from "./strings";
import { colors, radius, spacing } from "./theme";

interface FieldProps {
  label: string;
  value: string;
  unit: string;
  onChange: (text: string) => void;
}

function Field({ label, value, unit, onChange }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        <TextInput style={styles.fieldInput} value={value} onChangeText={onChange} keyboardType="numeric" />
        <Text style={styles.fieldUnit}>{unit}</Text>
      </View>
    </View>
  );
}

export interface ProfileScreenProps {
  profile: VehicleProfile;
  onSave: (profile: VehicleProfile) => void;
  onCancel: () => void;
}

/**
 * The car decides which connectors are usable and how much energy a session needs.
 * Whatever the driver types is put through the same coercion as a stored profile,
 * so an impossible car can never reach the ranking.
 */
export function ProfileScreen({ profile, onSave, onCancel }: ProfileScreenProps) {
  const [standard, setStandard] = useState<ConnectorStandard>(profile.connectorStandard);
  const [batteryKwh, setBatteryKwh] = useState(String(profile.batteryKwh));
  const [socFrom, setSocFrom] = useState(String(profile.socFrom));
  const [socTo, setSocTo] = useState(String(profile.socTo));

  const save = () => {
    onSave(
      coerceVehicleProfile({
        connectorStandard: standard,
        batteryKwh: Number(batteryKwh),
        socFrom: Number(socFrom),
        socTo: Number(socTo),
      }),
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{strings.profileTitle}</Text>
      <Text style={styles.hint}>{strings.profileHint}</Text>

      <Text style={styles.sectionLabel}>{strings.connectorSection}</Text>
      <View style={styles.standardRow}>
        {NATIONAL_STANDARDS.map((candidate) => (
          <Chip
            key={candidate}
            label={candidate}
            selected={standard === candidate}
            onPress={() => setStandard(candidate)}
          />
        ))}
      </View>

      <Field label={strings.batteryLabel} value={batteryKwh} unit={strings.batteryUnit} onChange={setBatteryKwh} />
      <Field label={strings.socFromLabel} value={socFrom} unit={strings.percentUnit} onChange={setSocFrom} />
      <Field label={strings.socToLabel} value={socTo} unit={strings.percentUnit} onChange={setSocTo} />

      <Pressable onPress={save} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{strings.save}</Text>
      </Pressable>
      <Pressable onPress={onCancel} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{strings.cancel}</Text>
      </Pressable>
      <Text style={styles.footnote}>
        {`${strings.profileFootnote} ${strings.defaultProfileNote}`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  hint: { fontSize: 13, color: colors.muted },
  sectionLabel: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  standardRow: { flexDirection: "row", gap: spacing.sm },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, color: colors.muted },
  fieldInputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  fieldInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  fieldUnit: { fontSize: 14, color: colors.muted, width: 40 },
  primaryButton: {
    backgroundColor: colors.chipSelected,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryButtonText: { color: colors.chipSelectedText, fontWeight: "700", fontSize: 15 },
  secondaryButton: { paddingVertical: spacing.sm, alignItems: "center" },
  secondaryButtonText: { color: colors.muted, fontSize: 14 },
  footnote: { fontSize: 12, color: colors.faint },
});
