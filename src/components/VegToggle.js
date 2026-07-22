import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";

export default function VegToggle({ vegOnly, onChange }) {
  const dotStyle = useAnimatedStyle(() => ({
    left: withSpring(vegOnly ? 52 : 4, { damping: 16, stiffness: 220 }),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: vegOnly }}
      onPress={() => onChange(!vegOnly)}
      style={styles.track}
    >
      <Text style={[styles.label, vegOnly ? styles.labelLeft : styles.labelRight]}>
        {vegOnly ? "Veg" : "Non-veg"}
      </Text>
      <Animated.View style={[styles.dot, dotStyle]}>
        <View style={[styles.dotInner, { backgroundColor: vegOnly ? colors.primary : colors.favoriteRed }]}>
          <Ionicons name="ellipse" size={10} color={colors.white} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 80,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.white,
    padding: 4,
    justifyContent: "center",
  },
  label: {
    position: "absolute",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.primary,
  },
  labelLeft: { left: 10 },
  labelRight: { right: 10 },
  dot: {
    position: "absolute",
    top: 4,
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  dotInner: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
