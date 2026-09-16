import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";

import { loadDocuments, type Documents } from "./src/data/documents";
import { loadFavorites, saveFavorites, toggleFavorite, type FavoriteRecord } from "./src/data/favorites";
import { loadProfile, saveProfile } from "./src/data/profile";
import { energyToAddKwh } from "./src/domain/price";
import { networkNames, rankStations, type RankedStation } from "./src/domain/rank";
import { DEFAULT_VEHICLE, type LatLng, type NetworkTariff, type VehicleProfile } from "./src/domain/types";
import { Controls } from "./src/ui/Controls";
import { ProfileScreen } from "./src/ui/ProfileScreen";
import { StationDetailScreen } from "./src/ui/StationDetailScreen";
import { StationRow } from "./src/ui/StationRow";
import { formatEnergy, formatUnmatchedFavorites } from "./src/ui/format";
import { strings } from "./src/ui/strings";
import { listOptionsFor } from "./src/ui/listOptions";
import { colors, spacing } from "./src/ui/theme";
import type { ListMode, SortOrder } from "./src/ui/types";

const BANGKOK_CENTER: LatLng = { lat: 13.7563, lng: 100.5018 };

export default function App() {
  const [documents, setDocuments] = useState<Documents | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [areaFallback, setAreaFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<VehicleProfile>(DEFAULT_VEHICLE);
  const [editingProfile, setEditingProfile] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RankedStation | null>(null);
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [mode, setMode] = useState<ListMode>("nearby");

  const [sort, setSort] = useState<SortOrder>("cheapest");
  const [radiusKm, setRadiusKm] = useState(10);
  const [minPowerKw, setMinPowerKw] = useState(0);
  const [network, setNetwork] = useState<string | null>(null);
  const [energyOverrideKwh, setEnergyOverrideKwh] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDocuments(await loadDocuments());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    const locate = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setAreaFallback(true);
        setOrigin(BANGKOK_CENTER);
        return;
      }
      const fix = await Location.getCurrentPositionAsync({});
      setOrigin({ lat: fix.coords.latitude, lng: fix.coords.longitude });
    };
    void locate();
    void load();
    void loadProfile().then(setProfile);
    void loadFavorites().then(setFavorites);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const networks = useMemo(() => networkNames(documents?.stations.stations ?? []), [documents]);
  const energyKwh = energyToAddKwh(profile, energyOverrideKwh);
  const tariffByNetwork = useMemo(() => {
    const index: Record<string, NetworkTariff | undefined> = {};
    for (const tariff of documents?.tariffs.networks ?? []) index[tariff.network] = tariff;
    return index;
  }, [documents]);

  const favoriteIds = useMemo(() => new Set(favorites.map((favorite) => favorite.stationId)), [favorites]);

  const unmatchedFavorites = useMemo(() => {
    if (!documents) return 0;
    const known = new Set(documents.stations.stations.map((station) => station.id));
    return favorites.filter((favorite) => !known.has(favorite.stationId)).length;
  }, [documents, favorites]);

  const ranked = useMemo(() => {
    if (!documents || !origin) return [];
    const stations =
      mode === "favorites"
        ? documents.stations.stations.filter((station) => favoriteIds.has(station.id))
        : documents.stations.stations;
    const options = listOptionsFor(mode, {
      origin,
      departure: new Date(),
      radiusKm,
      minPowerKw,
      network,
      sort,
      energyOverrideKwh,
    });
    return rankStations(stations, documents.tariffs, profile, options);
  }, [documents, origin, mode, favoriteIds, profile, sort, radiusKm, minPowerKw, network, energyOverrideKwh]);

  const profileLabel = `${profile.connectorStandard} · ${formatEnergy(profile.batteryKwh)} kWh · ${profile.socFrom}→${profile.socTo}%`;

  const persistProfile = useCallback((next: VehicleProfile) => {
    setProfile(next);
    setEditingProfile(false);
    void saveProfile(next);
  }, []);

  const toggleFavoriteStation = useCallback(
    (stationId: string) => {
      const next = toggleFavorite(favorites, stationId, new Date());
      setFavorites(next);
      void saveFavorites(next);
    },
    [favorites],
  );

  if (editingProfile) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ProfileScreen
          profile={profile}
          onSave={persistProfile}
          onCancel={() => setEditingProfile(false)}
        />
      </View>
    );
  }

  if (selectedEntry) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <StationDetailScreen
          entry={selectedEntry}
          tariff={tariffByNetwork[selectedEntry.station.network] ?? null}
          energyKwh={energyKwh}
          isFavorite={favoriteIds.has(selectedEntry.station.id)}
          onToggleFavorite={() => toggleFavoriteStation(selectedEntry.station.id)}
          onBack={() => setSelectedEntry(null)}
        />
      </View>
    );
  }

  const emptyMessage =
    mode !== "favorites"
      ? strings.noMatches
      : unmatchedFavorites > 0
        ? formatUnmatchedFavorites(unmatchedFavorites)
        : strings.favoritesEmpty;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Text style={styles.title}>{strings.listTitle}</Text>
      <Text style={styles.subtitle}>
        {`${strings.rankedByCostPrefix}${profile.connectorStandard}`}
        {areaFallback ? strings.areaFallbackSuffix : ""}
        {documents?.fromCache ? strings.cacheSuffix : ""}
      </Text>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.button} onPress={onRefresh}>
            <Text style={styles.buttonText}>{strings.retry}</Text>
          </Pressable>
        </View>
      ) : !documents || !origin ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.hint}>{strings.locating}</Text>
        </View>
      ) : (
        <FlatList
          data={ranked}
          keyExtractor={(item) => item.station.id}
          renderItem={({ item }) => (
            <StationRow
              item={item}
              isFavorite={favoriteIds.has(item.station.id)}
              onPress={() => setSelectedEntry(item)}
              onToggleFavorite={() => toggleFavoriteStation(item.station.id)}
            />
          )}
          ListHeaderComponent={
            <Controls
              mode={mode}
              onMode={setMode}
              favoriteCount={favorites.length}
              sort={sort}
              onSort={setSort}
              radiusKm={radiusKm}
              onRadius={setRadiusKm}
              minPowerKw={minPowerKw}
              onMinPower={setMinPowerKw}
              networks={networks}
              network={network}
              onNetwork={setNetwork}
              energyOverrideKwh={energyOverrideKwh}
              onEnergyOverride={setEnergyOverrideKwh}
              profileLabel={profileLabel}
              onEditProfile={() => setEditingProfile(true)}
              resultCount={ranked.length}
              unmatchedFavorites={unmatchedFavorites}
            />
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.hint}>{emptyMessage}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 64, paddingHorizontal: spacing.lg },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.md, fontSize: 13, color: colors.muted },
  list: { paddingBottom: spacing.xl, gap: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  hint: { fontSize: 14, color: colors.muted, textAlign: "center" },
  error: { fontSize: 14, color: colors.danger, textAlign: "center" },
  button: { backgroundColor: colors.chipSelected, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 8 },
  buttonText: { color: colors.chipSelectedText, fontWeight: "600" },
});
