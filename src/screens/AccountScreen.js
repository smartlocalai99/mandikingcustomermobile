import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useAddresses } from "../context/AddressContext";
import { useAuth } from "../context/AuthContext";
import { usePayment } from "../context/PaymentContext";
import EmptyState from "../components/EmptyState";

export default function AccountScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, logout, isLoggedIn, isHydrated } = useAuth();
  const { defaultAddress } = useAddresses();
  const { method } = usePayment();

  if (!isHydrated) return null;

  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f6f6f6" }}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>Account</Text>
          <Text style={styles.headerSubtitle}>Manage your settings</Text>
        </View>
        <EmptyState
          icon="person-outline"
          title="You haven't logged in"
          message="Please log in to manage your account."
          ctaLabel="Log in with Mobile Number"
          onPressCta={() => navigation.navigate("Login")}
        />
      </View>
    );
  }

  const rows = [
    { label: "Saved addresses", icon: "location-outline", target: "Addresses", subtitle: defaultAddress ? defaultAddress.line : "Add a delivery address" },
    { label: "Favourites", icon: "heart-outline", target: { tab: "Favorites" } },
    { label: "Order history", icon: "receipt-outline", target: { tab: "Orders" } },
    { label: "Payment methods", icon: "wallet-outline", target: "PaymentMethods", subtitle: method.label },
    { label: "Notifications", icon: "notifications-outline", target: "Notifications" },
    { label: "Help & support", icon: "help-circle-outline", target: "Help" },
  ];

  const handlePressRow = (target) => {
    if (typeof target === "object" && target.tab) {
      navigation.navigate("MainTabs", { screen: target.tab });
    } else {
      navigation.navigate(target);
    }
  };

  const handleLogout = () => {
    navigation.navigate("MainTabs", { screen: "Home" });
    logout();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.phone ? user.phone.slice(-2) : "SR"}</Text>
          </View>
          <View>
            <Text style={styles.profilePhone}>+91 {user?.phone ?? "—"}</Text>
            <Text style={styles.profileLocation}>Kadapa, Andhra Pradesh</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <Text style={styles.settingsLabel}>Settings</Text>

        <View style={styles.rowsCard}>
          {rows.map(({ label, icon, target, subtitle }, index) => (
            <Pressable
              key={label}
              onPress={() => handlePressRow(target)}
              style={[styles.row, index !== rows.length - 1 ? styles.rowBorder : null]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={icon} size={18} color="#b3402a" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowLabel}>{label}</Text>
                {subtitle ? (
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#c9c0b7" />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: colors.white },
  headerSubtitle: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  profileHeader: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 24 },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.4, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" },
  profileRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { height: 56, width: 56, borderRadius: 16, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "900", color: "#3c1712" },
  profilePhone: { fontSize: 18, fontWeight: "900", color: colors.white },
  profileLocation: { marginTop: 2, fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  settingsLabel: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, fontSize: 13, fontWeight: "900", color: colors.textPrimary },
  rowsCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#f4eee9" },
  rowIcon: { height: 36, width: 36, borderRadius: 12, backgroundColor: colors.offWhite, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  rowSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "600", color: colors.textFaint },
  logoutButton: { marginTop: 20, marginHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, borderWidth: 1, borderColor: "#f3d4d0", paddingVertical: 14 },
  logoutText: { fontSize: 14, fontWeight: "900", color: colors.danger },
});
