import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useAddresses } from "../context/AddressContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useMenuData } from "../context/MenuDataContext";
import { useOrders } from "../context/OrdersContext";
import { usePayment } from "../context/PaymentContext";
import { calculateDeliveryFee } from "../lib/deliveryFee";
import { playOrderSuccessSound } from "../lib/soundAssets";
import { buildOrderPayload } from "../lib/orderSubmission.mjs";
import EmptyState from "../components/EmptyState";

const PLACEHOLDER = "https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/icon.png";
const PAYMENT_ICONS = { cod: "cash-outline", upi: "phone-portrait-outline" };
const AVAILABLE_COUPONS = [{ code: "SPICE10", rate: 0.1, description: "Save 10% on this order" }];

function BasketRow({ entry, onIncrement, onDecrement, onRemove }) {
  const { item, quantity } = entry;
  return (
    <View style={styles.basketRow}>
      <Image source={{ uri: item.imageUrl || PLACEHOLDER }} style={styles.basketImage} contentFit="cover" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.basketTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.basketEach}>₹{item.price} each</Text>
        <View style={styles.stepper}>
          <Pressable onPress={onDecrement} style={styles.stepperBtn} hitSlop={6}>
            <Ionicons name="remove" size={14} color="#5f554c" />
          </Pressable>
          <Text style={styles.stepperCount}>{quantity}</Text>
          <Pressable onPress={onIncrement} style={styles.stepperBtn} hitSlop={6}>
            <Ionicons name="add" size={14} color="#5f554c" />
          </Pressable>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <Text style={styles.basketAmount}>₹{item.price * quantity}</Text>
        <Pressable onPress={onRemove} hitSlop={6}>
          <Ionicons name="trash-outline" size={18} color="#c9c0b7" />
        </Pressable>
      </View>
    </View>
  );
}

function SuccessScreen({ orderId, total, navigation }) {
  return (
    <View style={styles.successWrap}>
      <View style={styles.successCircle}>
        <Ionicons name="checkmark" size={44} color={colors.white} />
      </View>
      <Text style={styles.successTitle}>Order placed!</Text>
      <Text style={styles.successMessage}>
        Order <Text style={{ fontWeight: "900", color: colors.textPrimary }}>#{orderId}</Text> for ₹{total} is being
        prepared. It should reach you in 30–40 minutes.
      </Text>

      <View style={{ marginTop: 32, width: "100%", gap: 12 }}>
        <Pressable
          onPress={() => navigation.navigate("MainTabs", { screen: "Orders" })}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Track order</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Back to home</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isLoggedIn, isHydrated } = useAuth();
  const { items, changeQuantity, checkoutSummary, clearCart, appliedOffer, offerDiscount, clearAppliedOffer } =
    useCart();
  const { placeOrder, ordersError } = useOrders();
  const { defaultAddress } = useAddresses();
  const { method } = usePayment();
  const { profile } = useMenuData();

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [placementError, setPlacementError] = useState("");

  if (!isHydrated) return null;

  const subtotal = checkoutSummary.totalAmount;
  const discount = appliedOffer ? offerDiscount : appliedCoupon ? Math.round(subtotal * appliedCoupon.rate) : 0;
  const deliveryFee = items.length > 0 && profile ? calculateDeliveryFee(profile, subtotal, defaultAddress).fee : 0;
  const total = Math.max(subtotal - discount + deliveryFee, 0);

  const isClosed = profile ? profile.busyMode || !profile.isOpen : false;
  const closedReason = profile?.busyMode
    ? "The restaurant is very busy right now and isn't accepting new orders."
    : "The restaurant is currently closed.";
  const isBelowMinOrder = Boolean(profile) && subtotal > 0 && subtotal < profile.minOrderAmount;
  const canCheckout = Boolean(defaultAddress) && !isClosed && !isBelowMinOrder;

  const handlePlaceOrder = async () => {
    if (!canCheckout || isPlacing) return;

    const result = buildOrderPayload({
      cartItems: items,
      totals: { totalItems: checkoutSummary.totalItems, subtotal, discount, deliveryFee },
      address: defaultAddress,
      paymentMethod: method,
      profile,
    });

    if (!result.ok) {
      setPlacementError(result.error.message);
      return;
    }

    setIsPlacing(true);
    setPlacementError("");
    try {
      // Cart is only cleared once the insert actually succeeds, so a failed
      // submission (network drop, RLS error, etc.) never loses the basket.
      const savedOrder = await placeOrder(result.payload);
      clearCart();
      setPlacedOrder(savedOrder);
      playOrderSuccessSound();
    } catch {
      setPlacementError("Could not place your order. Your cart is still safe.");
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{placedOrder ? "Order confirmed" : "Your Order"}</Text>
      </View>

      {placedOrder ? (
        <SuccessScreen orderId={placedOrder.id} total={placedOrder.total} navigation={navigation} />
      ) : items.length === 0 ? (
        <EmptyState
          imageSource={require("../../assets/emptyplate.webp")}
          icon="basket-outline"
          title="Your basket is waiting"
          message="The feast hasn't started yet. Pick something delicious and let's fill this plate."
          ctaLabel="Explore the menu"
          onPressCta={() => navigation.navigate("MainTabs", { screen: "Home" })}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View>
              {items.map((entry) => (
                <BasketRow
                  key={entry.item.id}
                  entry={entry}
                  onIncrement={() => changeQuantity(entry.item, entry.quantity + 1, entry.sectionTitle)}
                  onDecrement={() => changeQuantity(entry.item, entry.quantity - 1, entry.sectionTitle)}
                  onRemove={() => changeQuantity(entry.item, 0, entry.sectionTitle)}
                />
              ))}
            </View>
            <Pressable onPress={() => navigation.navigate("MainTabs", { screen: "Home" })} style={styles.addMoreButton}>
              <Text style={styles.addMoreText}>+ Add More Items</Text>
            </Pressable>
          </View>

          {!isLoggedIn ? (
            <>
              {appliedOffer ? (
                <View style={styles.offerChip}>
                  <View style={styles.offerIcon}>
                    <Ionicons name="pricetag-outline" size={16} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerTitle}>Offer applied: {appliedOffer.title}</Text>
                    <Text style={styles.offerSubtitle}>You save ₹{offerDiscount} on these items</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.totalsBlock}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Sub total</Text>
                  <Text style={styles.totalsLabel}>₹{subtotal}</Text>
                </View>
                {discount > 0 ? (
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { color: colors.primary }]}>Discount</Text>
                    <Text style={[styles.totalsLabel, { color: colors.primary }]}>-₹{discount}</Text>
                  </View>
                ) : null}
                <Text style={styles.guestNote}>Delivery fee is calculated after you sign in and add an address.</Text>
              </View>

              <Pressable onPress={() => navigation.navigate("Login")} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Sign Up to Continue</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={{ marginTop: 20, gap: 8 }}>
                <Pressable
                  onPress={() => navigation.navigate("Addresses", { redirectToCheckout: true })}
                  style={[styles.optionRow, !defaultAddress ? styles.optionRowMissing : null]}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="location-outline" size={18} color="#b3402a" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.optionLabel}>DELIVER TO</Text>
                      {!defaultAddress ? (
                        <View style={styles.requiredPill}>
                          <Text style={styles.requiredPillText}>Required</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.optionValue} numberOfLines={1}>
                      {defaultAddress ? defaultAddress.line : "Add a delivery address"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#c9c0b7" />
                </Pressable>

                <Pressable onPress={() => navigation.navigate("PaymentMethods")} style={styles.optionRow}>
                  <View style={styles.optionIcon}>
                    <Ionicons name={PAYMENT_ICONS[method.id]} size={18} color="#b3402a" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.optionLabel}>PAY VIA</Text>
                    <Text style={styles.optionValue} numberOfLines={1}>
                      {method.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#c9c0b7" />
                </Pressable>
              </View>

              <View style={{ marginTop: 20 }}>
                {appliedOffer ? (
                  <View style={styles.offerChip}>
                    <View style={styles.offerIcon}>
                      <Ionicons name="pricetag-outline" size={16} color={colors.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerTitle}>Offer applied: {appliedOffer.title}</Text>
                      <Text style={styles.offerSubtitle}>You save ₹{offerDiscount} on these items</Text>
                    </View>
                    <Pressable onPress={clearAppliedOffer} hitSlop={6}>
                      <Ionicons name="close-circle" size={20} color={colors.textFaint} />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Text style={styles.summaryTitle}>Discount Coupon</Text>
                    <View style={{ marginTop: 8, gap: 8 }}>
                      {AVAILABLE_COUPONS.map((coupon) => {
                        const isApplied = appliedCoupon?.code === coupon.code;
                        return (
                          <Pressable
                            key={coupon.code}
                            onPress={() => setAppliedCoupon(coupon)}
                            style={[styles.couponRow, isApplied ? styles.couponRowApplied : null]}
                          >
                            <View style={styles.optionIcon}>
                              <Ionicons name="pricetag-outline" size={16} color="#b3402a" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.optionValue}>{coupon.code}</Text>
                              <Text style={styles.offerSubtitle}>{coupon.description}</Text>
                            </View>
                            <Text style={[styles.couponStatus, isApplied ? { color: colors.primary } : null]}>
                              {isApplied ? "Applied" : "Tap to apply"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>

              <View style={styles.totalsBlock}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Sub total</Text>
                  <Text style={styles.totalsLabel}>₹{subtotal}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Delivery charges</Text>
                  {deliveryFee > 0 ? (
                    <Text style={styles.totalsLabel}>₹{deliveryFee}</Text>
                  ) : (
                    <Text style={[styles.totalsLabel, { fontWeight: "900", color: colors.success }]}>FREE</Text>
                  )}
                </View>
                {discount > 0 ? (
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { color: colors.primary }]}>Discount</Text>
                    <Text style={[styles.totalsLabel, { color: colors.primary }]}>-₹{discount}</Text>
                  </View>
                ) : null}
                <View style={[styles.totalsRow, styles.totalsFinalRow]}>
                  <Text style={styles.totalsFinalLabel}>Total</Text>
                  <Text style={styles.totalsFinalLabel}>₹{total}</Text>
                </View>
              </View>

              {isClosed ? (
                <Text style={styles.dangerNote}>{closedReason}</Text>
              ) : isBelowMinOrder ? (
                <Text style={styles.warningNote}>
                  Minimum order amount is ₹{profile.minOrderAmount}. Add ₹{Math.ceil(profile.minOrderAmount - subtotal)}{" "}
                  more to checkout.
                </Text>
              ) : null}

              {placementError || ordersError ? <Text style={styles.dangerNote}>{placementError || ordersError}</Text> : null}

              <Pressable
                onPress={defaultAddress ? handlePlaceOrder : () => navigation.navigate("Addresses", { redirectToCheckout: true })}
                disabled={isPlacing || (Boolean(defaultAddress) && !canCheckout)}
                style={[styles.primaryButton, isPlacing || (Boolean(defaultAddress) && !canCheckout) ? { opacity: 0.6 } : null]}
              >
                {isPlacing ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {!defaultAddress
                      ? "Add Delivery Address to Continue"
                      : isClosed
                        ? "Restaurant unavailable"
                        : isBelowMinOrder
                          ? "Below minimum order"
                          : `Checkout · ₹${total}`}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { height: 36, width: 36, borderRadius: 18, backgroundColor: "#f7f2ee", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  summaryCard: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    shadowColor: "#2b110c",
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  summaryTitle: { fontSize: 15, fontWeight: "900", color: colors.textPrimary },
  basketRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  basketImage: { height: 64, width: 64, borderRadius: 16, backgroundColor: colors.creamAlt },
  basketTitle: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  basketEach: { marginTop: 2, fontSize: 12, fontWeight: "700", color: colors.textMuted },
  stepper: { marginTop: 8, flexDirection: "row", alignItems: "center", height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.borderAlt, alignSelf: "flex-start" },
  stepperBtn: { width: 28, alignItems: "center", justifyContent: "center", height: "100%" },
  stepperCount: { width: 24, textAlign: "center", fontSize: 12, fontWeight: "900", color: colors.textPrimary },
  basketAmount: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  addMoreButton: { marginTop: 12, height: 44, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#d8c6c2", alignItems: "center", justifyContent: "center" },
  addMoreText: { fontSize: 13, fontWeight: "900", color: colors.primary },
  offerChip: { marginTop: 20, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(50,18,13,0.15)", backgroundColor: "#f5ecea", padding: 12 },
  offerIcon: { height: 36, width: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  offerTitle: { fontSize: 13, fontWeight: "900", color: colors.textPrimary },
  offerSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "700", color: colors.textMuted },
  totalsBlock: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  totalsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalsLabel: { fontSize: 13, fontWeight: "700", color: "#5f554c" },
  totalsFinalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  totalsFinalLabel: { fontSize: 16, fontWeight: "900", color: colors.textPrimary },
  guestNote: { marginTop: 4, fontSize: 12, fontWeight: "700", color: colors.textFaint, lineHeight: 17 },
  primaryButton: { marginTop: 24, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 16, fontWeight: "900", color: colors.white },
  secondaryButton: { height: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.borderAlt, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "900", color: colors.textPrimary },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  optionRowMissing: { borderColor: "#f3d4d0", backgroundColor: "#fdf6f4" },
  optionIcon: { height: 36, width: 36, borderRadius: 12, backgroundColor: colors.offWhite, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: 11, fontWeight: "800", color: colors.textFaint, textTransform: "uppercase" },
  optionValue: { marginTop: 2, fontSize: 13, fontWeight: "900", color: colors.textPrimary },
  requiredPill: { backgroundColor: "rgba(239,79,97,0.15)", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  requiredPillText: { fontSize: 9, fontWeight: "900", color: colors.danger },
  couponRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderAlt, backgroundColor: colors.white, padding: 12 },
  couponRowApplied: { borderColor: colors.primary, backgroundColor: "#f5ecea" },
  couponStatus: { fontSize: 11, fontWeight: "900", color: colors.textMuted },
  dangerNote: { marginTop: 16, borderRadius: 12, backgroundColor: colors.dangerBg, paddingVertical: 8, paddingHorizontal: 12, fontSize: 12, fontWeight: "800", color: colors.danger, textAlign: "center" },
  warningNote: { marginTop: 16, borderRadius: 12, backgroundColor: colors.warningBg, paddingVertical: 8, paddingHorizontal: 12, fontSize: 12, fontWeight: "800", color: colors.warningText, textAlign: "center" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  successCircle: { height: 96, width: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  successTitle: { marginTop: 24, fontSize: 22, fontWeight: "900", color: colors.textPrimary },
  successMessage: { marginTop: 8, fontSize: 14, fontWeight: "600", color: colors.textMuted, textAlign: "center", lineHeight: 20 },
});
