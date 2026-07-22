import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";

export default function EmptyState({ icon = "fast-food-outline", title, message, ctaLabel, onPressCta, style }) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={colors.textFaint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {ctaLabel ? (
        <Pressable onPress={onPressCta} style={styles.cta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 },
  iconWrap: { height: 76, width: 76, borderRadius: 38, backgroundColor: colors.creamAlt, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 18, fontSize: 17, fontWeight: "900", color: colors.textPrimary, textAlign: "center" },
  message: { marginTop: 6, fontSize: 13, fontWeight: "600", color: colors.textMuted, textAlign: "center", lineHeight: 19 },
  cta: { marginTop: 20, height: 48, paddingHorizontal: 24, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  ctaText: { fontSize: 13, fontWeight: "900", color: colors.white },
});
