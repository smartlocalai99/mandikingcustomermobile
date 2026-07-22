import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { buildMapsUrl, getOrderMapEndpoints } from "../lib/orderTrackingMap.mjs";

// No native map provider is bundled (react-native-maps would need a native
// rebuild), so this always renders the deterministic route illustration.
// When both endpoints have real coordinates, "Open in Maps" hands off to
// the platform's own maps app for live directions.
export default function OrderTrackingMap({ restaurant, deliveryAddress }) {
  const endpoints = getOrderMapEndpoints({ restaurant, deliveryAddress });
  const mapsUrl = buildMapsUrl(endpoints, Platform.OS);

  return (
    <View style={styles.wrap}>
      <View style={[styles.marker, { left: "18%", top: "62%" }]}>
        <Ionicons name="restaurant" size={16} color={colors.white} />
      </View>
      <View style={[styles.marker, styles.markerCustomer, { right: "18%", top: "22%" }]}>
        <Ionicons name="home" size={16} color={colors.white} />
      </View>
      <View style={styles.line} />

      {mapsUrl ? (
        <Pressable style={styles.mapsButton} onPress={() => Linking.openURL(mapsUrl)}>
          <Ionicons name="navigate" size={14} color={colors.primary} />
          <Text style={styles.mapsButtonText}>Open in Maps</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 130, backgroundColor: "#ebe7e2" },
  marker: { position: "absolute", height: 34, width: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  markerCustomer: { backgroundColor: "#b63b2d" },
  line: { position: "absolute", left: "24%", right: "24%", top: "42%", height: 3, backgroundColor: "#c9c0b7", borderRadius: 2 },
  mapsButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  mapsButtonText: { fontSize: 11, fontWeight: "900", color: colors.primary },
});
