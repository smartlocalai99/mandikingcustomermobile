import { useMemo, useRef, useState } from "react";
import { findNodeHandle, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { useAddresses } from "../context/AddressContext";
import { useAuth } from "../context/AuthContext";
import { useMenuData } from "../context/MenuDataContext";
import { matchesSearch, getMenuSearchSuggestions } from "../lib/menuSearch";
import VegToggle from "../components/VegToggle";
import SearchBar from "../components/SearchBar";
import OfferCarousel from "../components/OfferCarousel";
import CategoryRow from "../components/CategoryRow";
import ProductCard from "../components/ProductCard";
import HomeAddressSheet from "../components/HomeAddressSheet";

function chunk(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function resolveTargetHeading(category, sections) {
  if (category.sectionId) {
    const match = sections.find((section) => section.id === category.sectionId);
    if (match) return match.heading;
  }
  if (category.sectionTitle) {
    const match = sections.find((section) => section.heading === category.sectionTitle);
    if (match) return match.heading;
  }
  return null;
}

function ItemGrid({ items, sectionTitle, isOrderingDisabled }) {
  return (
    <View style={{ gap: 16 }}>
      {chunk(items, 2).map((row, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 16 }}>
          {row.map((item) => (
            <ProductCard key={item.id} item={item} sectionTitle={sectionTitle} isOrderingDisabled={isOrderingDisabled} />
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

function CollapsibleSection({ title, badgeText, isOpen, onToggle, children }) {
  return (
    <View>
      <Pressable onPress={onToggle} style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {title}
          </Text>
          {badgeText ? (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{badgeText}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textPrimary} />
      </Pressable>
      {isOpen ? children : null}
    </View>
  );
}

function formatTime(time) {
  if (!time) return null;
  const [hourStr, minute] = time.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

const DISCLAIMER_ITEMS = [
  "All prices are set directly by the restaurant.",
  "All nutritional information is indicative, values are per serve as shared by the restaurant and may vary depending on the ingredients and portion size.",
  "An average active adult requires 2,000 kcal energy per day; however, calorie needs may vary.",
  "Dish details might be AI crafted for a better experience.",
];

function RestaurantInfo({ profile }) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoTitle}>Disclaimer:</Text>
      {DISCLAIMER_ITEMS.map((item) => (
        <View key={item} style={styles.infoBulletRow}>
          <Text style={styles.infoBulletDot}>{"•"}</Text>
          <Text style={styles.infoBulletText}>{item}</Text>
        </View>
      ))}

      {profile ? (
        <View style={styles.infoProfileBlock}>
          <Text style={styles.infoProfileName}>{profile.name}</Text>
          {profile.addressLine ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#9292a0" />
              <Text style={styles.infoRowText}>{profile.addressLine}</Text>
            </View>
          ) : null}
          {profile.openingTime && profile.closingTime ? (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#9292a0" />
              <Text style={styles.infoRowText}>
                {formatTime(profile.openingTime)} – {formatTime(profile.closingTime)} daily ·{" "}
                <Text style={{ color: profile.isOpen && !profile.busyMode ? colors.success : colors.danger }}>
                  {profile.busyMode ? "Busy right now" : profile.isOpen ? "Open now" : "Closed"}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { defaultAddress } = useAddresses();
  const { profile, sections, offers, categories, isLoading } = useMenuData();

  const [vegOnly, setVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});

  const scrollRef = useRef(null);
  const sectionNodes = useRef({});

  const isOrderingDisabled = profile ? profile.busyMode || !profile.isOpen : false;
  const displayAddress = isLoggedIn && defaultAddress?.line?.trim() ? defaultAddress.line.trim() : "Kadapa";

  const recommendedItems = useMemo(
    () => sections.flatMap((section) => section.items.filter((item) => item.isBestseller)),
    [sections]
  );

  const searchSuggestions = useMemo(
    () => getMenuSearchSuggestions(sections, searchQuery, vegOnly),
    [sections, searchQuery, vegOnly]
  );

  const visibleRecommendedItems = vegOnly ? recommendedItems.filter((item) => item.isVeg) : recommendedItems;
  const searchedRecommendedItems = visibleRecommendedItems.filter((item) =>
    matchesSearch(item, "Recommended", searchQuery)
  );
  const showRecommended = searchQuery.trim().length === 0 || searchedRecommendedItems.length > 0;

  const visibleMenuSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: vegOnly ? section.items.filter((item) => item.isVeg) : section.items,
        }))
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => matchesSearch(item, section.heading, searchQuery)),
        }))
        .filter((section) => section.items.length > 0),
    [sections, vegOnly, searchQuery]
  );

  const hasResults = searchedRecommendedItems.length > 0 || visibleMenuSections.length > 0;

  const toggleSection = (title) => {
    setOpenSections((current) => ({ ...current, [title]: !(current[title] ?? true) }));
  };

  const jumpToSection = (category) => {
    const heading = resolveTargetHeading(category, sections);
    if (!heading) return;
    setOpenSections((current) => ({ ...current, [heading]: true }));
    requestAnimationFrame(() => {
      const node = sectionNodes.current[heading];
      const scrollHandle = findNodeHandle(scrollRef.current);
      if (node && scrollHandle) {
        node.measureLayout(scrollHandle, (x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
        });
      }
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Pressable style={styles.locationButton} onPress={() => setIsAddressSheetOpen(true)}>
          <View style={styles.locationIcon}>
            <Ionicons name="location-outline" size={20} color="#8f2f1d" />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {displayAddress}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.white} />
        </Pressable>

        <VegToggle vegOnly={vegOnly} onChange={setVegOnly} />
      </View>

      <View style={styles.searchWrap}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          suggestions={searchSuggestions}
          onSuggestionSelect={(title) => {
            setSearchQuery(title);
            setIsSearchFocused(false);
          }}
          isFocused={isSearchFocused}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
        />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <OfferCarousel offers={offers} />
        <CategoryRow categories={categories} onSelect={jumpToSection} />

        <View style={styles.menuArea}>
          {!isLoading && sections.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.centerStateTitle}>Menu coming soon</Text>
              <Text style={styles.centerStateSubtitle}>The restaurant is still setting up its menu.</Text>
            </View>
          ) : (
            <>
              {showRecommended && recommendedItems.length > 0 ? (
                <View style={{ marginBottom: 24 }}>
                  <CollapsibleSection
                    title="Recommended"
                    isOpen={openSections.Recommended ?? true}
                    onToggle={() => toggleSection("Recommended")}
                  >
                    <ItemGrid items={searchedRecommendedItems} sectionTitle="Recommended" isOrderingDisabled={isOrderingDisabled} />
                  </CollapsibleSection>
                </View>
              ) : null}

              {!hasResults ? (
                <View style={styles.notFoundBox}>
                  <View style={styles.notFoundIcon}>
                    <Ionicons name="search" size={22} color={colors.textFaint} />
                  </View>
                  <Text style={styles.centerStateTitle}>Item not found</Text>
                  <Text style={styles.centerStateSubtitle}>We couldn't find that on the menu. Try a different search.</Text>
                </View>
              ) : null}

              <View style={{ gap: 28 }}>
                {visibleMenuSections.map((section) => (
                  <View key={section.heading} ref={(node) => { sectionNodes.current[section.heading] = node; }}>
                    <CollapsibleSection
                      title={section.heading}
                      badgeText={section.badgeText}
                      isOpen={openSections[section.heading] ?? true}
                      onToggle={() => toggleSection(section.heading)}
                    >
                      <ItemGrid items={section.items} sectionTitle={section.heading} isOrderingDisabled={isOrderingDisabled} />
                    </CollapsibleSection>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <RestaurantInfo profile={profile} />
      </ScrollView>

      <HomeAddressSheet visible={isAddressSheetOpen} onClose={() => setIsAddressSheetOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  locationButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  locationIcon: { height: 36, width: 36, borderRadius: 18, backgroundColor: "#fff7df", alignItems: "center", justifyContent: "center" },
  locationText: { flexShrink: 1, fontSize: 14, fontWeight: "900", color: colors.white },
  searchWrap: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 12 },
  menuArea: { paddingHorizontal: 16, paddingTop: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  sectionTitleRow: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  sectionTitle: { flexShrink: 1, fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  sectionBadge: { backgroundColor: colors.favoriteRed, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  sectionBadgeText: { fontSize: 10, fontWeight: "900", color: colors.white, textTransform: "uppercase" },
  centerState: { alignItems: "center", paddingVertical: 32 },
  centerStateTitle: { fontSize: 16, fontWeight: "900", color: colors.textPrimary },
  centerStateSubtitle: { marginTop: 4, fontSize: 13, fontWeight: "600", color: colors.textMuted, textAlign: "center" },
  notFoundBox: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    backgroundColor: "#f7f2ee",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  notFoundIcon: { height: 56, width: 56, borderRadius: 28, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  infoSection: { borderTopWidth: 1, borderTopColor: "#dedee7", backgroundColor: "#f5f5fa", paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32 },
  infoTitle: { fontSize: 17, fontWeight: "900", color: "#4b4b55" },
  infoBulletRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  infoBulletDot: { fontSize: 13, color: "#5d5d68" },
  infoBulletText: { flex: 1, fontSize: 13, fontWeight: "500", color: "#5d5d68", lineHeight: 19 },
  infoProfileBlock: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#d6d6df", paddingTop: 20 },
  infoProfileName: { fontSize: 16, fontWeight: "900", color: "#4b4b55" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10 },
  infoRowText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#5d5d68", lineHeight: 19 },
});
