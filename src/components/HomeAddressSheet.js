import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useAddresses } from "../context/AddressContext";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import { getDisplayLocation } from "../lib/locationDisplay.mjs";

export default function HomeAddressSheet({ visible, onClose }) {
  const navigation = useNavigation();
  const { isLoggedIn } = useAuth();
  const { addresses = [], defaultAddress, setDefault, isLoadingAddresses, isMutatingAddress, addressError } =
    useAddresses();
  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  const { savedLocation } = useOnboarding();
  const hasSavedAddresses = isLoggedIn && safeAddresses.length > 0;

  const handleSelect = async (address) => {
    if (address.id === defaultAddress?.id) {
      onClose();
      return;
    }
    try {
      await setDefault(address.id);
      onClose();
    } catch {
      // AddressContext keeps the readable error; sheet stays open.
    }
  };

  const handleManage = () => {
    onClose();
    navigation.navigate(isLoggedIn ? "Addresses" : "Login");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Choose delivery address</Text>
              <Text style={styles.subtitle}>Select where you want your order delivered</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {isLoadingAddresses ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
          ) : hasSavedAddresses ? (
            <ScrollView style={{ marginTop: 16, maxHeight: 320 }}>
              {safeAddresses.map((address) => {
                const isSelected = address.id === defaultAddress?.id;
                return (
                  <Pressable
                    key={address.id}
                    disabled={isMutatingAddress}
                    onPress={() => handleSelect(address)}
                    style={[styles.addressRow, isSelected ? styles.addressRowSelected : null]}
                  >
                    <View style={styles.addressIcon}>
                      <Ionicons name="location-outline" size={20} color={colors.accentRed} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.addressLabel}>{address.label}</Text>
                      <Text style={styles.addressLine} numberOfLines={1}>
                        {address.line}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyRow}>
              <View style={styles.addressIcon}>
                <Ionicons name="location-outline" size={20} color={colors.accentRed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>{getDisplayLocation({ savedLocation })}</Text>
                <Text style={styles.addressLine}>
                  {savedLocation ? "Current location confirmed on this device" : "Add an address for accurate delivery"}
                </Text>
              </View>
            </View>
          )}

          {addressError ? <Text style={styles.error}>{addressError}</Text> : null}

          <Pressable onPress={handleManage} style={styles.manageButton}>
            <Text style={styles.manageButtonText}>{isLoggedIn ? "Add or manage addresses" : "Log in to save an address"}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.white} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: "80%",
  },
  handle: { alignSelf: "center", height: 4, width: 40, borderRadius: 2, backgroundColor: "#ded5ce" },
  headerRow: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: colors.textMuted },
  closeButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "#f4eee9",
    alignItems: "center",
    justifyContent: "center",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ece4dc",
    padding: 12,
    marginBottom: 8,
  },
  addressRowSelected: { borderColor: colors.primary, backgroundColor: "#f8f1ef" },
  addressIcon: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: "#fff7df",
    alignItems: "center",
    justifyContent: "center",
  },
  addressLabel: { fontSize: 13, fontWeight: "900", color: colors.textPrimary },
  addressLine: { marginTop: 2, fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  emptyRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ece4dc",
    backgroundColor: "#faf7f4",
    padding: 12,
  },
  error: { marginTop: 12, borderRadius: 12, backgroundColor: colors.dangerBg, padding: 10, fontSize: 12, fontWeight: "700", color: colors.danger },
  manageButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  manageButtonText: { fontSize: 13, fontWeight: "900", color: colors.white },
});
