import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors } from "../constants/colors";

export default function CategoryRow({ categories, onSelect }) {
  return (
    <View style={styles.row}>
      {categories.map((category) => (
        <Pressable
          key={category.id}
          onPress={() => onSelect(category)}
          style={({ pressed }) => [styles.item, pressed ? { opacity: 0.7 } : null]}
        >
          <View style={styles.imageWrap}>
            {category.imageUrl ? (
              <Image source={{ uri: category.imageUrl }} style={styles.image} contentFit="contain" />
            ) : null}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {category.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  item: { flex: 1, alignItems: "center", gap: 8 },
  imageWrap: { height: 64, width: 64, alignItems: "center", justifyContent: "flex-end" },
  image: { width: "100%", height: "100%" },
  label: { fontSize: 12, fontWeight: "900", color: colors.textSecondary },
});
