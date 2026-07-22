import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Image } from "expo-image";
import { colors } from "../constants/colors";

const VEG_IMAGE = require("../../assets/veg.webp");
const NON_VEG_IMAGE = require("../../assets/nonveg.webp");

export default function VegToggle({ vegOnly, onChange }) {
  const dotStyle = useAnimatedStyle(() => ({
    left: withSpring(vegOnly ? 52 : 4, { damping: 16, stiffness: 220 }),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: vegOnly }}
      accessibilityLabel={vegOnly ? "Switch to full menu" : "Switch to vegetarian menu"}
      onPress={() => onChange(!vegOnly)}
      style={styles.track}
    >
      <Text style={[styles.label, vegOnly ? styles.labelLeft : styles.labelRight]}>
        {vegOnly ? "Veg" : "Non-veg"}
      </Text>
      <Animated.View style={[styles.dot, dotStyle]}>
        <Image source={vegOnly ? VEG_IMAGE : NON_VEG_IMAGE} style={styles.dotImage} contentFit="contain" />
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
  dotImage: { height: 22, width: 22 },
});
