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
import { getPrimaryCategories, normalizeMenuSections } from "../lib/menuPresentation.mjs";

const MenuDataContext = createContext(null);

const FALLBACK_CATEGORIES = getPrimaryCategories();

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
        setSections(normalizeMenuSections(nextSections));
        setOffers(nextOffers);
        const nextCategories = await listActiveCategories(client);
        const nextCategoryState = getPrimaryCategories(nextCategories);
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
        setSections(normalizeMenuSections(cached.sections));
        setOffers(cached.offers);
        setCategories(getPrimaryCategories(cached.categories));
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

    // Refresh when the app returns to the foreground or when Realtime reports
    // a menu change. Avoid a permanent polling loop on the free Supabase plan.
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") refetch();
    });
    return () => {
      cancelled = true;
      client.removeChannel(channel);
      appStateSub.remove();
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
