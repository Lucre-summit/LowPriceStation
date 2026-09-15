import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";

import { loadDocuments, type Documents } from "./src/data/documents";
import { rankStations, type RankedStation } from "./src/domain/rank";
import type { PriceForConnector } from "./src/domain/price";
import { DEFAULT_VEHICLE, type LatLng } from "./src/domain/types";

const BANGKOK_CENTER: LatLng = { lat: 13.7563, lng: 100.5018 };
const RADIUS_KM = 10;

function describePrice(price: PriceForConnector | null): string {
  if (!price) return "ไม่ทราบราคา";
  const unit = price.rate.unit === "kWh" ? "หน่วย" : price.rate.unit === "hour" ? "ชม." : "นาที";
  const window = price.window === "on-peak" ? " · peak" : price.window === "off-peak" ? " · off-peak" : "";
  return `${price.unitPriceThb.toFixed(2)} ฿/${unit}${window}`;
}

function describeDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`;
}

function StationRow({ item }: { item: RankedStation }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.name} numberOfLines={1}>
          {item.station.name}
        </Text>
        <Text style={styles.distance}>{describeDistance(item.distanceKm)}</Text>
      </View>
      <Text style={styles.network}>{item.station.network}</Text>
      <View style={styles.rowFoot}>
        <Text style={item.price ? styles.price : styles.priceUnknown}>{describePrice(item.price)}</Text>
        {item.stalePrice ? <Text style={styles.stale}>ราคาอาจไม่เป็นปัจจุบัน</Text> : null}
      </View>
    </View>
  );
}

export default function App() {
  const [documents, setDocuments] = useState<Documents | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [areaFallback, setAreaFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const ranked =
    documents && origin
      ? rankStations(documents.stations.stations, documents.tariffs, DEFAULT_VEHICLE, {
          origin,
          arrival: new Date(),
          radiusKm: RADIUS_KM,
          minPowerKw: 0,
          network: null,
          sort: "nearest",
        })
      : [];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Text style={styles.title}>สถานีชาร์จใกล้ฉัน</Text>
      <Text style={styles.subtitle}>
        {`รัศมี ${RADIUS_KM} กม. · CCS2`}
        {areaFallback ? " · ใช้พื้นที่กรุงเทพฯ แทนตำแหน่งจริง" : ""}
        {documents?.fromCache ? " · ข้อมูลจากแคช" : ""}
      </Text>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.button} onPress={onRefresh}>
            <Text style={styles.buttonText}>ลองอีกครั้ง</Text>
          </Pressable>
        </View>
      ) : !documents || !origin ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.hint}>กำลังหาสถานีใกล้คุณ…</Text>
        </View>
      ) : (
        <FlatList
          data={ranked}
          keyExtractor={(item) => item.station.id}
          renderItem={({ item }) => <StationRow item={item} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.hint}>ไม่พบสถานี CCS2 ในรัศมี {RADIUS_KM} กม. — ลองกดรีเฟรชอีกครั้ง</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7f8", paddingTop: 72, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#111" },
  subtitle: { marginTop: 4, marginBottom: 12, fontSize: 13, color: "#555" },
  list: { paddingBottom: 32, gap: 10 },
  row: { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 4 },
  rowHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: "#111" },
  distance: { fontSize: 13, color: "#666" },
  network: { fontSize: 13, color: "#666" },
  rowFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  price: { fontSize: 15, fontWeight: "600", color: "#0a7d32" },
  priceUnknown: { fontSize: 15, color: "#8a6d00" },
  stale: { fontSize: 12, color: "#b45309" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  hint: { fontSize: 14, color: "#555", textAlign: "center" },
  error: { fontSize: 14, color: "#b91c1c", textAlign: "center" },
  button: { backgroundColor: "#111", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
