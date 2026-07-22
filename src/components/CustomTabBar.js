import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { useCart } from "../context/CartContext";

const ICONS = {
  Home: "home",
  Favorites: "heart-outline",
  Orders: "receipt-outline",
  Account: "person-outline",
};

function CheckoutButton({ summary, onPress, bottom }) {
  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom }]}>
      <Pressable onPress={onPress} style={styles.checkoutButton}>
        <View style={styles.checkoutLeft}>
          <View style={styles.checkoutIcon}>
            <Ionicons name="restaurant-outline" size={22} color={colors.white} />
          </View>
          <View>
            <Text style={styles.checkoutItems}>
              {summary.totalItems} item{summary.totalItems === 1 ? "" : "s"} added
            </Text>
            <Text style={styles.checkoutAmount}>₹{summary.totalAmount} total</Text>
          </View>
        </View>
        <View style={styles.checkoutRight}>
          <Text style={styles.checkoutLabel}>Checkout</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </View>
      </Pressable>
    </View>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);
  const { checkoutSummary } = useCart();

  if (checkoutSummary.totalItems > 0) {
    return (
      <CheckoutButton
        summary={checkoutSummary}
        bottom={bottom}
        onPress={() => navigation.navigate("Checkout")}
      />
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom }]}
    >
      <BlurView intensity={60} tint="light" style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <Ionicons
                name={ICONS[route.name]}
                size={22}
                color={isFocused ? colors.accentRed : "#000"}
              />
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? colors.accentRed : "#000" },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  bar: {
    flexDirection: "row",
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.42)",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  checkoutButton: {
    height: 72,
    borderRadius: 30,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    shadowColor: "#32120d",
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  checkoutLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkoutIcon: { height: 44, width: 44, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  checkoutItems: { fontSize: 13, fontWeight: "900", color: colors.white },
  checkoutAmount: { marginTop: 2, fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.8)" },
  checkoutRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  checkoutLabel: { fontSize: 15, fontWeight: "900", color: colors.white },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
  },
});
