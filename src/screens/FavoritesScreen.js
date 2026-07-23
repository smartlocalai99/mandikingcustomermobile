import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useFavorites } from "../context/FavoritesContext";
import EmptyState from "../components/EmptyState";
import ProductCard from "../components/ProductCard";

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { items: favoriteItems = [], isHydrated } = useFavorites();
  const items = Array.isArray(favoriteItems) ? favoriteItems : [];

  if (!isHydrated) return null;

  const isEmpty = items.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: isEmpty ? "#f6f6f6" : colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Favourites</Text>
        <Text style={styles.headerSubtitle}>Dishes you've saved for later</Text>
      </View>

      {isEmpty ? (
        <EmptyState
          imageSource={require("../../assets/emptyplate.webp")}
          icon="heart-outline"
          title="Save room for your favourites"
          message="Tap the heart on dishes you love and they'll be waiting for you here."
          ctaLabel="Discover dishes"
          onPressCta={() => navigation.navigate("MainTabs", { screen: "Home" })}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          <View style={{ gap: 16 }}>
            {chunk(items, 2).map((row, index) => (
              <View key={index} style={{ flexDirection: "row", gap: 16 }}>
                {row.map(({ item, sectionTitle }) => (
                  <ProductCard key={item.id} item={item} sectionTitle={sectionTitle} />
                ))}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function chunk(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: colors.white },
  headerSubtitle: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
});
