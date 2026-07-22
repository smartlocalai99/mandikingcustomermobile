import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useCart } from "../context/CartContext";
import { useMenuData } from "../context/MenuDataContext";
import { useNotifications } from "../context/NotificationsContext";

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function NotificationsSheet({ visible, onClose }) {
  const navigation = useNavigation();
  const { notifications, markRead, markAllRead } = useNotifications();
  const { offers } = useMenuData();
  const { applyOffer } = useCart();

  const handlePress = (notification) => {
    if (!notification.isRead) markRead(notification.id);
    if (notification.offerId) {
      const offer = offers.find((candidate) => candidate.id === notification.offerId);
      if (offer) {
        applyOffer(offer);
        onClose();
        navigation.navigate("Checkout");
        return;
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Notifications</Text>
            {notifications.some((n) => !n.isRead) ? (
              <Pressable onPress={markAllRead}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            ) : null}
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-outline" size={28} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>Offers and updates from the restaurant will show up here.</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {notifications.map((notification) => (
                <Pressable
                  key={notification.id}
                  onPress={() => handlePress(notification)}
                  style={[styles.row, !notification.isRead ? styles.rowUnread : null]}
                >
                  {!notification.isRead ? <View style={styles.dot} /> : <View style={{ width: 6 }} />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    <Text style={styles.rowBody} numberOfLines={2}>
                      {notification.body}
                    </Text>
                    <Text style={styles.rowTime}>{formatTime(notification.createdAt)}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
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
  headerRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  markAllText: { fontSize: 12, fontWeight: "800", color: colors.primary },
  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  emptySubtitle: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textAlign: "center", paddingHorizontal: 24 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  rowUnread: { backgroundColor: "#faf5ef" },
  dot: { marginTop: 6, height: 6, width: 6, borderRadius: 3, backgroundColor: colors.favoriteRed },
  rowTitle: { fontSize: 13, fontWeight: "900", color: colors.textPrimary },
  rowBody: { marginTop: 2, fontSize: 12, fontWeight: "600", color: colors.textSecondary, lineHeight: 17 },
  rowTime: { marginTop: 4, fontSize: 10, fontWeight: "700", color: colors.textFaint },
});
