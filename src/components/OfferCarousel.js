import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useCart } from "../context/CartContext";

const PLACEHOLDER = "https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/icon.png";

export default function OfferCarousel({ offers = [] }) {
  const safeOffers = Array.isArray(offers) ? offers : [];
  const { width } = useWindowDimensions();
  const { applyOffer } = useCart();
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleOrderNow = (offer) => {
    applyOffer(offer);
    navigation.navigate("Checkout");
  };

  useEffect(() => {
    if (safeOffers.length < 2) return undefined;
    const id = setInterval(() => {
      const nextIndex = (activeIndex + 1) % safeOffers.length;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setActiveIndex(nextIndex);
    }, 4000);
    return () => clearInterval(id);
  }, [activeIndex, safeOffers.length, width]);

  if (safeOffers.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setActiveIndex(Math.min(Math.max(index, 0), safeOffers.length - 1));
        }}
      >
        {safeOffers.map((offer) => (
          <Pressable
            key={offer.id}
            onPress={() => handleOrderNow(offer)}
            style={[styles.slide, { width, height: (width * 9) / 16 }]}
          >
            <Image
              source={{ uri: offer.imageUrl || PLACEHOLDER }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          </Pressable>
        ))}
      </ScrollView>

      {safeOffers.length > 1 ? (
        <View pointerEvents="none" style={styles.dots}>
          {safeOffers.map((offer, index) => (
            <View
              key={offer.id}
              style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.primary },
  slide: { backgroundColor: colors.primary },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 20, backgroundColor: colors.white },
  dotInactive: { width: 6, backgroundColor: "rgba(255,255,255,0.5)" },
});
