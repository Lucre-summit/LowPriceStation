import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { networkAppCandidates, navigationCandidates, platformFor } from "../domain/handoff";
import type { RankedStation } from "../domain/rank";
import type { NetworkTariff } from "../domain/types";
import { FavoriteButton } from "./FavoriteButton";
import {
  formatClock,
  formatConnector,
  formatDistanceKm,
  formatPeakDays,
  formatSessionCost,
  formatStationHeadline,
  formatThaiDate,
  formatUnitPrice,
} from "./format";
import { strings } from "./strings";
import { colors, radius, spacing } from "./theme";

export interface StationDetailScreenProps {
  entry: RankedStation;
  tariff: NetworkTariff | null;
  energyKwh: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
}

const currentPlatform = platformFor(Platform.OS);

/** Hands over to the first form the device can actually take, rather than failing silently. */
async function openFirstAvailable(urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Nothing handles this form here; the next one may still work.
    }
  }
}

function describeIdleFee(tariff: NetworkTariff | null): string | null {
  const fee = tariff?.idleFee;
  if (!fee) return null;
  const perUnit = fee.unit === "minute" ? strings.idlePerMinuteSuffix : strings.idlePerHourSuffix;
  return `${fee.priceThb}${perUnit} ${strings.afterGracePrefix}${fee.graceMinutes}${strings.graceSuffix}`;
}

function describeWindow(tariff: NetworkTariff | null): string {
  const window = tariff?.peakWindow;
  if (!window || window.days.length === 0) return strings.flatAllDay;
  return `${formatPeakDays(window.days)} ${window.start}–${window.end} = ${strings.peakLabel} · ${strings.offPeakLabel}${strings.offPeakSuffix}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

/** Everything a driver needs before choosing this station, and the two ways out of the app. */
export function StationDetailScreen({
  entry,
  tariff,
  energyKwh,
  isFavorite,
  onToggleFavorite,
  onBack,
}: StationDetailScreenProps) {
  const headline = formatStationHeadline(entry);
  const detail = entry.compatible
    ? `${formatUnitPrice(entry.price)} · ${strings.energyUsedPrefix}${energyKwh} kWh`
    : entry.station.connectors.map(formatConnector).join(" · ");
  const idleFee = describeIdleFee(tariff);
  const band = entry.price
    ? `${entry.price.rate.minPowerKw}–${entry.price.rate.maxPowerKw} kW`
    : tariff
      ? `${tariff.rates.map((rate) => `${rate.minPowerKw}–${rate.maxPowerKw}`).join(", ")} kW`
      : strings.addressUnknown;
  const evidence = tariff
    ? `${strings.evidencePrefix}${tariff.evidence === "primary" ? strings.evidencePrimary : strings.evidenceSecondary}`
    : "";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{strings.back}</Text>
        </Pressable>
        <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
      </View>

      <Text style={styles.name}>{entry.station.name}</Text>
      <Text style={styles.meta}>
        {`${entry.station.network} · ${formatDistanceKm(entry.distanceKm)} · ${strings.arrivalLabel} ${formatClock(entry.arrival)}`}
      </Text>

      <View style={styles.costCard}>
        <Text style={headline.emphasized ? styles.cost : styles.costUnknown}>{headline.text}</Text>
        <Text style={styles.costDetail}>{detail}</Text>
        {idleFee ? <Text style={styles.idleWarning}>{`${strings.idleFeeLabel}: ${idleFee}`}</Text> : null}
      </View>

      <Text style={styles.section}>{strings.tariffSection}</Text>
      {tariff ? (
        <View style={styles.card}>
          <Field label={strings.powerBandLabel} value={band} />
          <Field label={strings.windowLabel} value={describeWindow(tariff)} />
          {entry.compatible && !entry.price ? <Text style={styles.notice}>{strings.noTariffNotice}</Text> : null}
        </View>
      ) : (
        <Text style={styles.notice}>{strings.noTariffNotice}</Text>
      )}

      <Text style={styles.section}>{strings.trustSection}</Text>
      <View style={styles.card}>
        <Field
          label={strings.checkedAtPrefix}
          value={`${formatThaiDate(entry.checkedAt)}${evidence ? ` · ${evidence}` : ""}`}
        />
        {entry.stalePrice ? <Text style={styles.idleWarning}>{strings.staleWarning}</Text> : null}
        <Pressable
          disabled={!tariff?.sourceUrl}
          onPress={() => tariff?.sourceUrl && void Linking.openURL(tariff.sourceUrl)}
        >
          <Text style={tariff?.sourceUrl ? styles.link : styles.linkDisabled}>
            {tariff?.sourceUrl ? strings.viewSource : strings.sourceUnknown}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.section}>{strings.hardwareSection}</Text>
      <View style={styles.card}>
        {entry.station.connectors.map((connector) => (
          <Text key={connector.standard} style={styles.connector}>
            {formatConnector(connector)}
          </Text>
        ))}
        <Field label={strings.openingHoursLabel} value={entry.station.openingHours ?? strings.openingHoursUnknown} />
        <Field label={strings.addressLabel} value={entry.station.address ?? strings.addressUnknown} />
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => void openFirstAvailable(navigationCandidates(currentPlatform, entry.station.position))}
      >
        <Text style={styles.primaryButtonText}>{strings.navigate}</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          void openFirstAvailable(
            networkAppCandidates(currentPlatform, entry.station.network, tariff?.appLinks ?? null),
          )
        }
      >
        <Text style={styles.secondaryButtonText}>{strings.openNetworkApp}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  backButton: { paddingVertical: spacing.sm },
  backText: { fontSize: 15, color: colors.accent, fontWeight: "600" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 24, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  costCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cost: { fontSize: 28, fontWeight: "700", color: colors.accent },
  costUnknown: { fontSize: 18, color: colors.warn, fontWeight: "600" },
  costDetail: { fontSize: 14, color: colors.text },
  idleWarning: { fontSize: 13, color: colors.warn },
  section: { fontSize: 13, color: colors.muted, marginTop: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm },
  field: { gap: 2 },
  fieldLabel: { fontSize: 12, color: colors.faint },
  fieldValue: { fontSize: 14, color: colors.text },
  connector: { fontSize: 14, color: colors.text, fontWeight: "600" },
  notice: { fontSize: 13, color: colors.warn },
  link: { fontSize: 14, color: colors.accent, fontWeight: "600" },
  linkDisabled: { fontSize: 14, color: colors.faint },
  primaryButton: {
    backgroundColor: colors.chipSelected,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryButtonText: { color: colors.chipSelectedText, fontWeight: "700", fontSize: 16 },
  secondaryButton: { paddingVertical: spacing.md, alignItems: "center" },
  secondaryButtonText: { color: colors.accent, fontWeight: "600", fontSize: 15 },
});
