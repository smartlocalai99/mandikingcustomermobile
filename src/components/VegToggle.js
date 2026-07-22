import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Image } from "expo-image";
import { colors } from "../constants/colors";
import { customerDesign } from "../constants/customerDesign.mjs";

const VEG_IMAGE = require("../../assets/veg.webp");
const NON_VEG_IMAGE = require("../../assets/nonveg.webp");
const { width: TRACK_WIDTH, height: TRACK_HEIGHT, trackPadding: TRACK_PADDING, knobSize: KNOB_SIZE, knobLeftOff: KNOB_LEFT_OFF, knobLeftOn: KNOB_LEFT_ON } = customerDesign.toggle;

export default function VegToggle({ vegOnly, onChange }) {
  const dotStyle = useAnimatedStyle(() => ({
    // damping (16) was well under the critically-damped value for this
    // stiffness (~2*sqrt(220) ≈ 30), so the knob oscillated past each edge
    // before settling — the "vibrating" toggle. overshootClamping stops it
    // dead at the target instead of ever crossing it.
    left: withSpring(vegOnly ? KNOB_LEFT_ON : KNOB_LEFT_OFF, {
      damping: 30,
      stiffness: 220,
      overshootClamping: true,
    }),
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
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: colors.white,
    padding: TRACK_PADDING,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
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
    top: TRACK_PADDING,
    height: KNOB_SIZE,
    width: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  dotImage: { height: KNOB_SIZE - 4, width: KNOB_SIZE - 4 },
});
