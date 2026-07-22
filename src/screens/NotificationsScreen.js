import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";

const STORAGE_KEY = "smartrest_notification_prefs";

const PREFERENCES = [
  {
    id: "orderUpdates",
    label: "Order updates",
    description: "Order confirmed, being prepared, out for delivery.",
    icon: "fast-food-outline",
    locked: true,
  },
  {
    id: "offers",
    label: "Offers & discounts",
    description: "Coupons and limited-time deals on your favourite dishes.",
    icon: "gift-outline",
  },
  {
    id: "reminders",
    label: "Delivery reminders",
    description: "A nudge when your usual order time rolls around.",
    icon: "time-outline",
  },
];

const DEFAULT_PREFS = { orderUpdates: true, offers: true, reminders: false };

function Toggle({ checked, disabled, onChange }) {
  const dotStyle = useAnimatedStyle(() => ({
    left: withSpring(checked ? 22 : 2, { damping: 18, stiffness: 260 }),
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.toggleTrack, checked ? styles.toggleTrackOn : null, disabled ? { opacity: 0.6 } : null]}
    >
      <Animated.View style={[styles.toggleDot, dotStyle]} />
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const canGoBack = navigation.canGoBack();

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      } catch {
        // ignore corrupt storage
      }
    })();
  }, []);

  const updatePref = (id, value) => {
    setPrefs((current) => {
      const next = { ...current, [id]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        {canGoBack ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={colors.white} />
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Choose what you'd like to hear about</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {PREFERENCES.map(({ id, label, description, icon, locked }) => (
          <View key={id} style={styles.prefCard}>
            <View style={styles.prefIcon}>
              <Ionicons name={icon} size={18} color="#b3402a" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.prefLabel}>{label}</Text>
              <Text style={styles.prefDescription}>{description}</Text>
            </View>
            {locked ? <Ionicons name="lock-closed-outline" size={14} color={colors.textFaint} style={{ marginTop: 2 }} /> : null}
            <Toggle checked={prefs[id]} disabled={locked} onChange={(value) => updatePref(id, value)} />
          </View>
        ))}

        <View style={styles.noteBox}>
          <Ionicons name="notifications-outline" size={16} color={colors.textFaint} />
          <Text style={styles.noteText}>
            Order updates can't be turned off — they're how you'll know when your food is on its way.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { marginBottom: 12, height: 36, width: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: colors.white },
  headerSubtitle: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  prefCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 16 },
  prefIcon: { height: 40, width: 40, borderRadius: 12, backgroundColor: colors.offWhite, alignItems: "center", justifyContent: "center" },
  prefLabel: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  prefDescription: { marginTop: 2, fontSize: 12, fontWeight: "600", color: colors.textMuted, lineHeight: 17 },
  toggleTrack: { height: 28, width: 48, borderRadius: 14, backgroundColor: colors.borderAlt },
  toggleTrackOn: { backgroundColor: colors.primary },
  toggleDot: { position: "absolute", top: 2, height: 24, width: 24, borderRadius: 12, backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, backgroundColor: "#faf5ef", padding: 12 },
  noteText: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.textMuted, lineHeight: 17 },
});
