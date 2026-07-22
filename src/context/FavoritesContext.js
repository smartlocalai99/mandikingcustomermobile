import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { playFavoriteAddedSound, playFavoriteRemovedSound } from "../lib/soundAssets";

const FavoritesContext = createContext(null);
const STORAGE_KEY = "smartrest_favorites";

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setFavorites(JSON.parse(stored));
      } catch {
        // ignore corrupt storage
      }
      setIsHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(() => {});
  }, [favorites, isHydrated]);

  const toggleFavorite = (item, sectionTitle = "") => {
    let didAdd = false;
    setFavorites((current) => {
      const updated = { ...current };
      if (updated[item.id]) {
        delete updated[item.id];
      } else {
        updated[item.id] = { item, sectionTitle };
        didAdd = true;
      }
      return updated;
    });
    if (didAdd) playFavoriteAddedSound();
    else playFavoriteRemovedSound();
  };

  const value = useMemo(
    () => ({
      favorites,
      toggleFavorite,
      isFavorite: (id) => Boolean(favorites[id]),
      items: Object.values(favorites),
      isHydrated,
    }),
    [favorites, isHydrated]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
