import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";

const PLACEHOLDER = "https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/icon.png";

function ProductCard({ item, sectionTitle, isOrderingDisabled = false }) {
  const { cart, changeQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const quantity = cart[item.id]?.quantity || 0;
  const isSoldOut = item.isAvailable === false;
  const favorited = isFavorite(item.id);

  const onIncrement = () => {
    if (isSoldOut || isOrderingDisabled) return;
    changeQuantity(item, quantity + 1, sectionTitle);
  };
  const onDecrement = () => changeQuantity(item, quantity - 1, sectionTitle);

  return (
    <View style={[styles.card, isSoldOut ? styles.cardDisabled : null]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: item.imageUrl || PLACEHOLDER }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
        <Pressable
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item, sectionTitle)}
          hitSlop={8}
        >
          <Ionicons
            name={favorited ? "heart" : "heart-outline"}
            size={16}
            color={favorited ? colors.favoriteRed : colors.textMuted}
          />
        </Pressable>
        {isSoldOut ? (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.vegDot, { borderColor: item.isVeg ? colors.primary : colors.favoriteRed }]}>
            <View style={[styles.vegDotInner, { backgroundColor: item.isVeg ? colors.primary : colors.favoriteRed }]} />
          </View>
          {!item.badgeText && item.isBestseller ? (
            <View style={styles.bestsellerPill}>
              <Text style={styles.bestsellerText}>Bestseller</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.badgeText ? (
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>{item.badgeText}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description || "Freshly prepared and packed for your order."}
        </Text>

        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{item.price}</Text>
            {item.oldPrice ? <Text style={styles.oldPrice}>₹{item.oldPrice}</Text> : null}
          </View>

          {isSoldOut ? (
            <View style={styles.addButtonDisabled}>
              <Text style={styles.addButtonDisabledText}>Sold out</Text>
            </View>
          ) : quantity > 0 ? (
            <View style={styles.stepper}>
              <Pressable onPress={onDecrement} style={styles.stepperButton} hitSlop={6}>
                <Ionicons name="remove" size={16} color={colors.success} />
              </Pressable>
              <Text style={styles.stepperCount}>{quantity}</Text>
              <Pressable
                onPress={onIncrement}
                disabled={isOrderingDisabled}
                style={[styles.stepperButton, isOrderingDisabled ? { opacity: 0.4 } : null]}
                hitSlop={6}
              >
                <Ionicons name="add" size={16} color={colors.success} />
              </Pressable>
            </View>
          ) : isOrderingDisabled ? (
            <View style={styles.addButtonDisabled}>
              <Text style={styles.addButtonDisabledText}>Closed</Text>
            </View>
          ) : (
            <Pressable onPress={onIncrement} style={styles.addButton}>
              <Text style={styles.addButtonText}>ADD</Text>
              <Ionicons name="add" size={14} color={colors.success} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default memo(ProductCard, (previous, next) =>
  previous.item === next.item &&
  previous.sectionTitle === next.sectionTitle &&
  previous.isOrderingDisabled === next.isOrderingDisabled
);

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.white },
  cardDisabled: { opacity: 0.6 },
  imageWrap: {
    height: 130,
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  image: { width: "100%", height: "100%" },
  favoriteButton: {
    position: "absolute",
    right: 8,
    top: 8,
    height: 30,
    width: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  soldOutBadge: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 999,
    paddingVertical: 4,
    alignItems: "center",
  },
  soldOutText: { color: colors.white, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  body: { paddingTop: 6, paddingBottom: 8 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  vegDot: { height: 16, width: 16, borderRadius: 4, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  vegDotInner: { height: 8, width: 8, borderRadius: 4 },
  bestsellerPill: { backgroundColor: "#fff2d6", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bestsellerText: { fontSize: 10, fontWeight: "900", color: "#8f2f1d" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  title: { flex: 1, fontSize: 15, fontWeight: "900", color: "#202020", lineHeight: 18 },
  offerBadge: { backgroundColor: colors.favoriteRed, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  offerBadgeText: { fontSize: 9, fontWeight: "900", color: colors.white, textTransform: "uppercase" },
  description: { marginTop: 2, fontSize: 11, color: "#756b64", minHeight: 28 },
  footer: { marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, flexShrink: 1 },
  price: { backgroundColor: "#ffdf3f", paddingHorizontal: 5, borderRadius: 3, fontSize: 15, fontWeight: "900", color: "#000" },
  oldPrice: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textDecorationLine: "line-through" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    minWidth: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.white,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  addButtonText: { fontSize: 13, fontWeight: "900", color: colors.success },
  addButtonDisabled: {
    height: 36,
    minWidth: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  addButtonDisabledText: { fontSize: 11, fontWeight: "900", color: colors.textMuted },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    minWidth: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#36a46a",
    backgroundColor: colors.white,
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  stepperButton: { padding: 4 },
  stepperCount: { fontSize: 13, fontWeight: "900", color: colors.success },
});
