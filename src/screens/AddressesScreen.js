import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useAddresses } from "../context/AddressContext";
import { requestForegroundLocation, reverseGeocodeCoordinates } from "../lib/locationPermissions.mjs";
import EmptyState from "../components/EmptyState";

const LABELS = [
  { id: "Home", icon: "home-outline" },
  { id: "Work", icon: "briefcase-outline" },
  { id: "Other", icon: "location-outline" },
];

const EMPTY_FORM = { label: "Home", line: "", landmark: "", phone: "", lat: null, lng: null };

function labelIcon(label) {
  return LABELS.find((l) => l.id === label)?.icon ?? "location-outline";
}

function AddressSheet({ visible, initialValue, onClose, onSave, isSaving, saveError }) {
  const [form, setForm] = useState(initialValue ?? EMPTY_FORM);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState(null);
  const isValid = form.line.trim().length > 3;

  useEffect(() => {
    if (!visible) return;
    setForm(initialValue ? { ...EMPTY_FORM, ...initialValue } : { ...EMPTY_FORM });
    setLocateError(null);
  }, [visible, initialValue]);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocateError(null);
    try {
      const location = await requestForegroundLocation({
        permissions: {
          getForegroundPermissionsAsync: () => Location.getForegroundPermissionsAsync(),
          requestForegroundPermissionsAsync: () => Location.requestForegroundPermissionsAsync(),
        },
        getCurrentPositionAsync: (options) => Location.getCurrentPositionAsync(options),
        reverseGeocode: (latitude, longitude) => reverseGeocodeCoordinates(latitude, longitude),
        accuracy: Location.Accuracy.Balanced,
      });
      setForm((f) => ({
        ...f,
        line: location.line || f.line,
        landmark: location.landmark || f.landmark,
        lat: location.latitude,
        lng: location.longitude,
      }));
    } catch (error) {
      setLocateError(error);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{initialValue ? "Edit address" : "Add new address"}</Text>

          <View style={styles.labelRow}>
            {LABELS.map(({ id, icon }) => {
              const isActive = form.label === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setForm((f) => ({ ...f, label: id }))}
                  style={[styles.labelButton, isActive ? styles.labelButtonActive : null]}
                >
                  <Ionicons name={icon} size={16} color={isActive ? colors.primary : "#5f554c"} />
                  <Text style={[styles.labelButtonText, isActive ? { color: colors.primary } : null]}>{id}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable disabled={isLocating} onPress={handleUseCurrentLocation} style={styles.locateButton}>
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            )}
            <Text style={styles.locateButtonText}>{isLocating ? "Finding your location…" : "Use current location"}</Text>
          </Pressable>

          {locateError ? (
            <View style={styles.locateErrorRow}>
              <Text style={styles.locateErrorText}>{locateError.message}</Text>
              {locateError.canOpenSettings ? (
                <Pressable onPress={() => Linking.openSettings()}>
                  <Text style={styles.locateErrorLink}>Open Settings</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {form.lat != null && form.lng != null ? (
            <View style={styles.locateConfirmedRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.locateConfirmedText}>Location attached — you can still edit the address below</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput
            value={form.line}
            onChangeText={(text) => setForm((f) => ({ ...f, line: text }))}
            placeholder="House / flat no., street, area"
            placeholderTextColor={colors.textFaint}
            multiline
            numberOfLines={2}
            style={[styles.input, styles.inputMultiline]}
          />

          <Text style={styles.fieldLabel}>Landmark (optional)</Text>
          <TextInput
            value={form.landmark}
            onChangeText={(text) => setForm((f) => ({ ...f, landmark: text }))}
            placeholder="Near…"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Contact number (optional)</Text>
          <TextInput
            value={form.phone}
            onChangeText={(text) => setForm((f) => ({ ...f, phone: text.replace(/\D/g, "").slice(0, 10) }))}
            placeholder="98765 43210"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            style={styles.input}
          />

          <View style={styles.sheetActions}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => isValid && onSave(form)}
              disabled={!isValid || isSaving}
              style={[styles.saveButton, !isValid || isSaving ? { opacity: 0.4 } : null]}
            >
              {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Save address</Text>}
            </Pressable>
          </View>

          {saveError ? <Text style={styles.sheetError}>{saveError}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddressCard({ address, isBusy, onEdit, onDelete, onSetDefault }) {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={styles.cardIcon}>
          <Ionicons name={labelIcon(address.label)} size={18} color="#b3402a" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.cardLabel}>{address.label}</Text>
            {address.isDefault ? (
              <View style={styles.defaultPill}>
                <Text style={styles.defaultPillText}>DEFAULT</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardLine}>{address.line}</Text>
          {address.landmark ? <Text style={styles.cardMuted}>Near {address.landmark}</Text> : null}
          {address.phone ? <Text style={styles.cardMuted}>+91 {address.phone}</Text> : null}
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable onPress={onSetDefault} disabled={address.isDefault || isBusy} style={styles.cardActionButton}>
          <Ionicons name={address.isDefault ? "star" : "star-outline"} size={15} color="#a56a10" />
          <Text style={[styles.cardActionText, { color: "#a56a10" }]}>{address.isDefault ? "Default" : "Set as default"}</Text>
        </Pressable>
        <Pressable onPress={onEdit} disabled={isBusy} style={[styles.cardActionButton, { marginLeft: "auto" }]}>
          <Ionicons name="pencil-outline" size={15} color="#5f554c" />
          <Text style={styles.cardActionText}>Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} disabled={isBusy} style={styles.cardActionButton}>
          <Ionicons name="trash-outline" size={15} color={colors.favoriteRed} />
          <Text style={[styles.cardActionText, { color: colors.favoriteRed }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AddressesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const redirectToCheckout = Boolean(route.params?.redirectToCheckout);

  const { addresses, addAddress, updateAddress, removeAddress, setDefault, refreshAddresses, isLoadingAddresses, isMutatingAddress, addressError } =
    useAddresses();
  const [sheet, setSheet] = useState(null);
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = async (data) => {
    try {
      if (sheet && sheet !== "new") {
        await updateAddress(sheet.id, data);
      } else {
        await addAddress(data);
      }
      setSheet(null);

      if (redirectToCheckout) {
        navigation.navigate("Checkout");
        return;
      }

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    } catch {
      // The context keeps the sheet open and provides the readable error.
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <Text style={styles.headerSubtitle}>Where should we deliver your order?</Text>
        </View>
      </View>

      {justSaved ? (
        <View style={[styles.toast, { top: insets.top + 12 }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={styles.toastText}>Address saved</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        {redirectToCheckout && addresses.length === 0 ? (
          <View style={styles.calloutMissing}>
            <Text style={styles.calloutTitle}>Add an address to continue</Text>
            <Text style={styles.calloutSubtitle}>We need a delivery address before you can place your order.</Text>
          </View>
        ) : null}

        {addressError && !sheet ? (
          <View style={styles.errorBox}>
            <Text style={styles.dangerNote}>{addressError}</Text>
            <Pressable onPress={() => refreshAddresses().catch(() => {})} disabled={isLoadingAddresses} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{isLoadingAddresses ? "Retrying…" : "Retry"}</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoadingAddresses ? (
          <ActivityIndicator style={{ marginVertical: 40 }} color={colors.primary} />
        ) : addresses.length === 0 ? (
          <EmptyState icon="location-outline" title="No saved addresses" message="Add a delivery address so checkout is one tap next time." />
        ) : (
          <View style={{ gap: 12 }}>
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                isBusy={isMutatingAddress}
                onEdit={() => setSheet(address)}
                onDelete={() => removeAddress(address.id).catch(() => {})}
                onSetDefault={() => setDefault(address.id).catch(() => {})}
              />
            ))}
          </View>
        )}

        <Pressable
          onPress={() => setSheet("new")}
          disabled={isMutatingAddress}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Add New Address</Text>
        </Pressable>
      </ScrollView>

      <AddressSheet
        visible={Boolean(sheet)}
        initialValue={sheet && sheet !== "new" ? sheet : null}
        onClose={() => setSheet(null)}
        onSave={handleSave}
        isSaving={isMutatingAddress}
        saveError={addressError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { height: 36, width: 36, borderRadius: 18, backgroundColor: "#f7f2ee", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "900", color: colors.textPrimary },
  headerSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: colors.textMuted },
  toast: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.textPrimary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: { fontSize: 13, fontWeight: "700", color: colors.white },
  calloutMissing: { borderRadius: 16, borderWidth: 1, borderColor: "#f3d4d0", backgroundColor: "#fdf6f4", padding: 14, marginBottom: 12 },
  calloutTitle: { fontSize: 13, fontWeight: "900", color: colors.danger },
  calloutSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: "#a56a58" },
  dangerNote: { marginBottom: 12, borderRadius: 12, backgroundColor: colors.dangerBg, padding: 10, fontSize: 12, fontWeight: "700", color: colors.danger },
  errorBox: { marginBottom: 12 },
  retryButton: { alignSelf: "flex-start", marginTop: -4, paddingHorizontal: 10, paddingVertical: 6 },
  retryButtonText: { fontSize: 12, fontWeight: "900", color: colors.primary },
  card: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 16 },
  cardIcon: { height: 40, width: 40, borderRadius: 12, backgroundColor: colors.offWhite, alignItems: "center", justifyContent: "center" },
  cardLabel: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  defaultPill: { backgroundColor: "#f5ecea", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  defaultPillText: { fontSize: 9, fontWeight: "900", color: colors.primary },
  cardLine: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "#5f554c", lineHeight: 18 },
  cardMuted: { marginTop: 2, fontSize: 12, fontWeight: "700", color: colors.textFaint },
  cardActions: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  cardActionButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardActionText: { fontSize: 12, fontWeight: "900", color: "#5f554c" },
  addButton: { marginTop: 16, height: 48, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#d8c6c2", alignItems: "center", justifyContent: "center" },
  addButtonText: { fontSize: 13, fontWeight: "900", color: colors.primary },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: "88%" },
  sheetHandle: { alignSelf: "center", height: 4, width: 40, borderRadius: 2, backgroundColor: "#e4dcd2", marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: "900", color: colors.textPrimary },
  labelRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  labelButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  labelButtonActive: { borderColor: colors.primary, backgroundColor: "#f5ecea" },
  labelButtonText: { fontSize: 13, fontWeight: "900", color: "#5f554c" },
  locateButton: {
    marginTop: 16,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  locateButtonText: { fontSize: 13, fontWeight: "900", color: colors.primary },
  locateErrorRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  locateErrorText: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.danger },
  locateErrorLink: { fontSize: 12, fontWeight: "900", color: colors.primary },
  locateConfirmedRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  locateConfirmedText: { fontSize: 11, fontWeight: "700", color: colors.success },
  fieldLabel: { marginTop: 16, fontSize: 12, fontWeight: "800", color: colors.textMuted },
  input: { marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  inputMultiline: { minHeight: 56, textAlignVertical: "top" },
  sheetActions: { marginTop: 20, flexDirection: "row", gap: 12 },
  cancelButton: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  cancelButtonText: { fontSize: 14, fontWeight: "900", color: "#5f554c" },
  saveButton: { flex: 1, height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  saveButtonText: { fontSize: 14, fontWeight: "900", color: colors.white },
  sheetError: { marginTop: 12, textAlign: "center", fontSize: 12, fontWeight: "800", color: colors.danger },
});
