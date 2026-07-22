import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { usePayment } from "../context/PaymentContext";

const ICONS = { cod: "cash-outline", upi: "phone-portrait-outline" };
const UPI_APPS = ["PhonePe", "Google Pay", "Paytm"];

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { methodId, setMethodId, methods } = usePayment();

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <Text style={styles.headerSubtitle}>Choose how you'd like to pay at checkout</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {methods.map((method) => {
          const isSelected = methodId === method.id;
          return (
            <Pressable
              key={method.id}
              onPress={() => setMethodId(method.id)}
              style={[styles.methodCard, isSelected ? styles.methodCardSelected : null]}
            >
              <View style={[styles.methodIcon, isSelected ? { backgroundColor: colors.primary } : null]}>
                <Ionicons name={ICONS[method.id]} size={18} color={isSelected ? colors.white : "#b3402a"} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.methodLabel}>{method.label}</Text>
                <Text style={styles.methodNote}>{method.note}</Text>
                {method.id === "upi" ? (
                  <View style={styles.upiRow}>
                    {UPI_APPS.map((label) => (
                      <View key={label} style={styles.upiBadge}>
                        <Text style={styles.upiBadgeText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
            </Pressable>
          );
        })}

        <Text style={styles.footerNote}>
          This is the payment method we'll pre-select for you at checkout. You can always switch it there before
          placing an order.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { height: 36, width: 36, borderRadius: 18, backgroundColor: "#f7f2ee", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "900", color: colors.textPrimary },
  headerSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: colors.textMuted },
  methodCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 16 },
  methodCardSelected: { borderColor: colors.primary, backgroundColor: "#f5ecea" },
  methodIcon: { height: 40, width: 40, borderRadius: 12, backgroundColor: colors.offWhite, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  methodNote: { marginTop: 2, fontSize: 12, fontWeight: "600", color: colors.textMuted, lineHeight: 17 },
  upiRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  upiBadge: { height: 32, borderRadius: 10, borderWidth: 1, borderColor: colors.borderAlt, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  upiBadgeText: { fontSize: 10, fontWeight: "800", color: "#5f554c" },
  footerNote: { marginTop: 8, fontSize: 12, fontWeight: "600", color: colors.textFaint, lineHeight: 18, paddingHorizontal: 4 },
});
