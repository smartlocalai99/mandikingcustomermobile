import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";

export default function SearchBar({ value = "", onChange, suggestions = [], onSuggestionSelect = () => {}, isFocused, onFocus, onBlur }) {
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const hasSuggestions = isFocused && value.trim().length > 0 && safeSuggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <Ionicons name="search" size={20} color="#000" />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Restaurant name or a dish..."
          placeholderTextColor="rgba(0,0,0,0.45)"
          style={styles.input}
        />
        <View style={styles.divider} />
        <Pressable style={styles.micButton} hitSlop={8}>
          <Ionicons name="mic-outline" size={20} color="#000" />
        </Pressable>
      </View>

      {hasSuggestions ? (
        <View style={styles.suggestions}>
          {safeSuggestions.map((suggestion) => (
            <Pressable
              key={suggestion.id}
              onPress={() => onSuggestionSelect(suggestion.title)}
              style={({ pressed }) => [styles.suggestionRow, pressed ? { backgroundColor: "#f4eee9" } : null]}
            >
              <View style={styles.suggestionImageWrap}>
                {suggestion.image ? (
                  <Image source={{ uri: suggestion.image }} style={styles.suggestionImage} contentFit="cover" />
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {suggestion.title}
                </Text>
                <Text style={styles.suggestionSection} numberOfLines={1}>
                  {suggestion.section}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative", zIndex: 10 },
  bar: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "600", color: "#000", paddingVertical: 0 },
  divider: { height: 26, width: 1, backgroundColor: "rgba(0,0,0,0.1)" },
  micButton: { height: 32, width: 32, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" },
  suggestions: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 260,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 20,
  },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, padding: 6 },
  suggestionImageWrap: { height: 44, width: 44, borderRadius: 10, overflow: "hidden", backgroundColor: "#f4eee9" },
  suggestionImage: { width: "100%", height: "100%" },
  suggestionTitle: { fontSize: 13, fontWeight: "900", color: "#201814" },
  suggestionSection: { marginTop: 2, fontSize: 11, fontWeight: "600", color: "#7b7169" },
});
