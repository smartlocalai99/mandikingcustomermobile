import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase } from "../lib/supabase";
import {
  getRestaurantProfile,
  listActiveCategories,
  listActiveMenu,
  listActiveOffers,
} from "../lib/restaurantData";
import { createTrailingRefresh } from "../lib/trailingRefresh.mjs";
import { readMenuCache, writeMenuCache } from "../lib/menuCache.mjs";

const MenuDataContext = createContext(null);

const FALLBACK_CATEGORIES = [
  { id: "fallback-mandi", label: "Mandi", imageUrl: null, sectionId: null, sectionTitle: "Chicken Mandi" },
  { id: "fallback-starters", label: "Starters", imageUrl: null, sectionId: null, sectionTitle: "Chicken Starters" },
  { id: "fallback-rotis", label: "Rotis", imageUrl: null, sectionId: null, sectionTitle: "Rotis" },
  { id: "fallback-desserts", label: "Desserts", imageUrl: null, sectionId: null, sectionTitle: "Desserts" },
];

export function MenuDataProvider({ children }) {
  const client = useMemo(() => getSupabase(), []);
  const [profile, setProfile] = useState(null);
  const [sections, setSections] = useState([]);
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const refetch = createTrailingRefresh(async () => {
      try {
        const [nextProfile, nextSections, nextOffers] = await Promise.all([
          getRestaurantProfile(client),
          listActiveMenu(client),
          listActiveOffers(client),
        ]);
        if (cancelled) return;
        setProfile(nextProfile);
        setSections(nextSections);
        setOffers(nextOffers);
        const nextCategories = await listActiveCategories(client);
        const nextCategoryState = nextCategories.length > 0 ? nextCategories : FALLBACK_CATEGORIES;
        if (!cancelled) {
          setCategories(nextCategoryState);
          await writeMenuCache(AsyncStorage, {
            profile: nextProfile,
            sections: nextSections,
            offers: nextOffers,
            categories: nextCategoryState,
            savedAt: Date.now(),
          });
        }
      } catch {
        // Existing cache/fallback state remains usable.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });

    const hydrateAndRefresh = async () => {
      const cached = await readMenuCache(AsyncStorage);
      if (!cancelled && cached) {
        setProfile(cached.profile);
        setSections(cached.sections);
        setOffers(cached.offers);
        setCategories(cached.categories.length > 0 ? cached.categories : FALLBACK_CATEGORIES);
        setIsLoading(false);
      }
      refetch();
    };

    hydrateAndRefresh();

    const channel = client
      .channel("public:menu-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_profile" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_sections" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, refetch)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refetch();
      });

    // Same defensive pattern as the web app: mobile OSes can suspend the
    // websocket in the background with no clean disconnect event, so
    // refetch on foreground return and on a short interval regardless.
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") refetch();
    });
    const pollId = setInterval(refetch, 20000);

    return () => {
      cancelled = true;
      client.removeChannel(channel);
      appStateSub.remove();
      clearInterval(pollId);
    };
  }, [client]);

  const value = useMemo(
    () => ({ profile, sections, offers, categories, isLoading }),
    [profile, sections, offers, categories, isLoading]
  );

  return <MenuDataContext.Provider value={value}>{children}</MenuDataContext.Provider>;
}

export function useMenuData() {
  const ctx = useContext(MenuDataContext);
  if (!ctx) throw new Error("useMenuData must be used within MenuDataProvider");
  return ctx;
}
