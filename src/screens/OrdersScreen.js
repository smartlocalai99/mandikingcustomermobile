import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { useMenuData } from "../context/MenuDataContext";
import { useOrders } from "../context/OrdersContext";
import { createOrderView, formatRupees, splitOrders } from "../lib/orderView";
import EmptyState from "../components/EmptyState";

const PLACEHOLDER = "https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/icon.png";
const RIDER = { name: "Ravi Kumar", role: "Your delivery partner" };

function PreviousOrderCard({ order, accountPhone }) {
  const view = createOrderView(order, accountPhone);

  return (
    <View style={styles.previousCard}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.previousOrderId} numberOfLines={1}>
            Order #{view.id}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{view.statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.previousDate}>{view.placedAtLabel}</Text>
      </View>

      <View style={styles.previousItemsRow}>
        <View style={{ flexDirection: "row" }}>
          {view.itemRows.slice(0, 3).map((row, index) => (
            <Image
              key={row.key}
              source={{ uri: row.item.imageUrl || PLACEHOLDER }}
              style={[styles.previousAvatar, index > 0 ? { marginLeft: -12 } : null]}
              contentFit="cover"
            />
          ))}
        </View>
        <Text style={styles.previousItemsText} numberOfLines={2}>
          {view.itemRows.map((row) => row.title).join(", ") || "Order items unavailable"}
        </Text>
      </View>

      <View style={styles.previousFooter}>
        <Text style={styles.previousFooterMuted}>
          {view.totalItems} item{view.totalItems === 1 ? "" : "s"}
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.previousBillLabel}>Bill amount</Text>
          <Text style={styles.previousBillAmount}>₹{formatRupees(view.total)}</Text>
        </View>
      </View>
    </View>
  );
}

function PreviousOrders({ orders, accountPhone }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon="receipt-outline"
        title="No previous orders yet"
        message="Your completed and cancelled orders will appear here."
      />
    );
  }

  return (
    <View>
      <Text style={styles.previousHeading}>Previous Orders</Text>
      <View style={{ gap: 12 }}>
        {orders.map((order) => (
          <PreviousOrderCard key={order.id} order={order} accountPhone={accountPhone} />
        ))}
      </View>
    </View>
  );
}

function RouteVisual() {
  return (
    <View style={styles.routeVisual}>
      <View style={[styles.routeMarker, { left: "18%", top: "62%" }]}>
        <Ionicons name="restaurant" size={16} color={colors.white} />
      </View>
      <View style={[styles.routeMarker, styles.routeMarkerCustomer, { right: "18%", top: "22%" }]}>
        <Ionicons name="home" size={16} color={colors.white} />
      </View>
      <View style={styles.routeLine} />
    </View>
  );
}

function CurrentOrder({ order, accountPhone }) {
  const active = createOrderView(order, accountPhone);
  const hasContact = Boolean(active.contact) && active.contact !== "Contact unavailable";

  return (
    <View style={styles.currentCard}>
      <RouteVisual />

      <View style={styles.currentBody}>
        <View style={styles.riderRow}>
          <View style={styles.riderIcon}>
            <Ionicons name="bicycle-outline" size={24} color="#b3402a" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.riderName}>{RIDER.name}</Text>
            <Text style={styles.riderRole}>{RIDER.role}</Text>
          </View>
          <Pressable
            disabled={!hasContact}
            onPress={() => hasContact && Linking.openURL(`tel:${active.contact}`)}
            style={[styles.callButton, hasContact ? null : styles.callButtonDisabled]}
          >
            <Ionicons name="call" size={18} color={hasContact ? colors.white : colors.textFaint} />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
            <Ionicons name="location" size={18} color="#b63b2d" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.metaLabel}>Delivery Address</Text>
              <Text style={styles.metaValue}>{active.address}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Ionicons name="time-outline" size={18} color="#b63b2d" style={{ marginTop: 2 }} />
            <View>
              <Text style={styles.metaLabel}>Estimate Time</Text>
              <Text style={styles.metaValue}>30–40 min</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.detailsTitle}>Order Details</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{active.statusLabel}</Text>
            </View>
          </View>

          <View style={{ marginTop: 10, gap: 8 }}>
            {active.itemRows.length === 0 ? (
              <Text style={styles.detailsMuted}>Order items unavailable</Text>
            ) : (
              active.itemRows.map((row) => (
                <View key={row.key} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Text style={styles.detailsItemText}>
                    {row.quantity} {row.title}
                  </Text>
                  <Text style={styles.detailsItemAmount}>₹{formatRupees(row.lineTotal)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.deliveryChargesRow}>
            <Text style={styles.deliveryChargesLabel}>Delivery charges</Text>
            <Text style={styles.deliveryChargesFree}>FREE</Text>
          </View>

          <View style={styles.timelineBlock}>
            <Text style={styles.timelineTitle}>Order timeline</Text>
            <View style={{ marginTop: 12 }}>
              {active.timelineSteps.map((step, index) => (
                <View key={step.label} style={{ flexDirection: "row", gap: 12, paddingBottom: index === active.timelineSteps.length - 1 ? 0 : 20 }}>
                  <View style={{ alignItems: "center", width: 16 }}>
                    <View style={[styles.timelineDot, step.isComplete ? styles.timelineDotComplete : null]} />
                    {index < active.timelineSteps.length - 1 ? (
                      <View style={[styles.timelineConnector, step.isComplete ? styles.timelineConnectorComplete : null]} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={[styles.timelineLabel, step.isComplete ? styles.timelineLabelComplete : null]}>{step.label}</Text>
                    <Text style={styles.timelineTime}>{step.timeLabel}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalLabel}>₹{formatRupees(active.total)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, isHydrated } = useAuth();
  const { orders: orderList = [], isLoadingOrders, ordersError, refreshOrders } = useOrders();
  const orders = Array.isArray(orderList) ? orderList : [];
  const [selectedTab, setSelectedTab] = useState("current");

  if (!isHydrated) return null;

  const isEmpty = !isLoadingOrders && orders.length === 0;
  const { activeOrder, previousOrders } = splitOrders(orders);

  return (
    <View style={{ flex: 1, backgroundColor: isLoggedIn && !isEmpty ? colors.white : "#f5f5f5" }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerSubtitle}>Track your current and past orders</Text>
      </View>

      {!isLoggedIn ? (
        <EmptyState
          icon="receipt-outline"
          title="You haven't logged in"
          message="Please log in to view your orders."
          ctaLabel="Log in with Mobile Number"
          onPressCta={() => navigation.navigate("Login")}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}>
          {ordersError ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{ordersError}</Text>
              <Pressable onPress={() => refreshOrders().catch(() => {})}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {isLoadingOrders ? (
            <ActivityIndicator style={{ marginVertical: 48 }} color={colors.primary} />
          ) : isEmpty ? (
            <EmptyState
              icon="fast-food-outline"
              title="Your first feast awaits"
              message="Place your first order and follow every delicious detail from our kitchen to your doorstep."
              ctaLabel="Start your order"
              onPressCta={() => navigation.navigate("MainTabs", { screen: "Home" })}
            />
          ) : !activeOrder ? (
            <PreviousOrders orders={previousOrders} accountPhone={user?.phone} />
          ) : (
            <>
              <View style={styles.tabRow}>
                <Pressable
                  onPress={() => setSelectedTab("current")}
                  style={[styles.tabButton, selectedTab === "current" ? styles.tabButtonActive : null]}
                >
                  <Text style={[styles.tabButtonText, selectedTab === "current" ? styles.tabButtonTextActive : null]}>
                    Current Order
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedTab("previous")}
                  style={[styles.tabButton, selectedTab === "previous" ? styles.tabButtonActive : null]}
                >
                  <Text style={[styles.tabButtonText, selectedTab === "previous" ? styles.tabButtonTextActive : null]}>
                    Previous Orders
                  </Text>
                </Pressable>
              </View>

              {selectedTab === "current" ? (
                <CurrentOrder order={activeOrder} accountPhone={user?.phone} />
              ) : (
                <PreviousOrders orders={previousOrders} accountPhone={user?.phone} />
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: colors.white },
  headerSubtitle: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, backgroundColor: colors.dangerBg, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.danger },
  retryText: { fontSize: 12, fontWeight: "900", color: colors.primary },
  tabRow: { flexDirection: "row", backgroundColor: "#f2ece7", borderRadius: 16, padding: 4, marginBottom: 16, gap: 4 },
  tabButton: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabButtonActive: { backgroundColor: colors.primary },
  tabButtonText: { fontSize: 12, fontWeight: "900", color: "#74675f" },
  tabButtonTextActive: { color: colors.white },
  previousHeading: { fontSize: 17, fontWeight: "900", color: colors.textPrimary, marginBottom: 12 },
  previousCard: { borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 16 },
  previousOrderId: { fontSize: 13, fontWeight: "900", color: colors.textPrimary },
  statusPill: { alignSelf: "flex-start", marginTop: 6, backgroundColor: "#fff4de", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 10, fontWeight: "900", color: "#a56a10" },
  previousDate: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  previousItemsRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  previousAvatar: { height: 44, width: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.creamAlt },
  previousItemsText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#5f554c", lineHeight: 18 },
  previousFooter: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  previousFooterMuted: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  previousBillLabel: { fontSize: 10, fontWeight: "700", color: colors.textFaint },
  previousBillAmount: { fontSize: 15, fontWeight: "900", color: colors.textPrimary },
  routeVisual: { height: 130, backgroundColor: "#ebe7e2" },
  routeMarker: { position: "absolute", height: 34, width: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  routeMarkerCustomer: { backgroundColor: "#b63b2d" },
  routeLine: { position: "absolute", left: "24%", right: "24%", top: "42%", height: 3, backgroundColor: "#c9c0b7", borderRadius: 2 },
  currentCard: { borderRadius: 28, backgroundColor: colors.white, overflow: "hidden", shadowColor: "#2b110c", shadowOpacity: 0.12, shadowRadius: 30, shadowOffset: { width: 0, height: 12 } },
  currentBody: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#eee8e2", paddingBottom: 16 },
  riderIcon: { height: 48, width: 48, borderRadius: 24, backgroundColor: "#f7eee8", alignItems: "center", justifyContent: "center" },
  riderName: { fontSize: 16, fontWeight: "900", color: colors.textPrimary },
  riderRole: { marginTop: 2, fontSize: 12, fontWeight: "600", color: colors.textMuted },
  callButton: { height: 40, width: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  callButtonDisabled: { backgroundColor: colors.creamAlt },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, borderBottomWidth: 1, borderBottomColor: "#eee8e2", paddingVertical: 16 },
  metaLabel: { fontSize: 11, fontWeight: "800", color: colors.textFaint },
  metaValue: { marginTop: 3, fontSize: 13, fontWeight: "900", color: colors.textPrimary, lineHeight: 18 },
  detailsSection: { paddingTop: 16 },
  detailsTitle: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  detailsMuted: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  detailsItemText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#5f554c", lineHeight: 18 },
  detailsItemAmount: { fontSize: 13, fontWeight: "800", color: "#5f554c" },
  deliveryChargesRow: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  deliveryChargesLabel: { fontSize: 13, fontWeight: "800", color: "#5f554c" },
  deliveryChargesFree: { fontSize: 13, fontWeight: "900", color: colors.success },
  timelineBlock: { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  timelineTitle: { fontSize: 15, fontWeight: "900", color: colors.textPrimary },
  timelineDot: { height: 14, width: 14, borderRadius: 7, borderWidth: 3, borderColor: "#d8cec6", backgroundColor: colors.white },
  timelineDotComplete: { borderColor: colors.primary, backgroundColor: colors.primary },
  timelineConnector: { width: 2, flex: 1, backgroundColor: colors.borderAlt, marginTop: 2 },
  timelineConnectorComplete: { backgroundColor: colors.primary },
  timelineLabel: { fontSize: 12, fontWeight: "900", color: colors.textFaint },
  timelineLabelComplete: { color: colors.textPrimary },
  timelineTime: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  totalRow: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#ddd4cc", borderStyle: "dashed", paddingTop: 12 },
  totalLabel: { fontSize: 15, fontWeight: "900", color: colors.textPrimary },
});
