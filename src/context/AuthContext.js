import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCustomerProfile, normalizePhone, updateCustomerName, upsertCustomer } from "../lib/customerData";

const AuthContext = createContext(null);
const STORAGE_KEY = "smartrest_auth";
const PROFILE_CACHE_KEY = "smartrest_customer_profiles";
const PROFILE_SYNC_TIMEOUT_MS = 15000;

function withDeadline(promise, ms, message = "The account request timed out.") {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

async function readCachedProfile(phone) {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    const name = typeof profiles?.[phone]?.name === "string" ? profiles[phone].name.trim() : "";
    return name ? { phone, name } : null;
  } catch {
    return null;
  }
}

async function cacheProfile(profile) {
  if (!profile?.phone || !profile?.name) return;
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    profiles[profile.phone] = { phone: profile.phone, name: profile.name };
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profiles));
  } catch {
    // Cache is an optimization; authentication must still work without it.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;

    async function hydrateAuth() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const normalizedPhone = normalizePhone(parsed.phone);
          if (active) setUser({ phone: normalizedPhone, name: parsed.name || "" });
          if (parsed.name) await cacheProfile({ phone: normalizedPhone, name: parsed.name });
          try {
            const profile = await withDeadline(upsertCustomer(normalizedPhone), PROFILE_SYNC_TIMEOUT_MS);
            if (active && profile) {
              const nextUser = { phone: normalizedPhone, ...profile };
              setUser(nextUser);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
              await cacheProfile(nextUser);
            }
          } catch {
            // Keep a valid local session usable offline. Account refresh will
            // reconcile it with Supabase when connectivity returns.
            if (active) setAuthError("Your account will sync when the connection returns.");
          }
        }
      } catch {
        if (active) {
          setAuthError("Unable to connect your account. Please try again.");
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } finally {
        if (active) setIsHydrated(true);
      }
    }

    hydrateAuth();
    return () => {
      active = false;
    };
  }, []);

  const login = async (phone, name = "") => {
    const normalizedPhone = normalizePhone(phone);
    const cachedProfile = await readCachedProfile(normalizedPhone);
    const nextUser = { phone: normalizedPhone, name: name.trim() || cachedProfile?.name || "" };
    setIsLoggingIn(true);
    setAuthError("");

    try {
      setUser(nextUser);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      const profile = await withDeadline(upsertCustomer(normalizedPhone, { name }), PROFILE_SYNC_TIMEOUT_MS);
      const userWithProfile = { ...nextUser, ...profile };
      setUser(userWithProfile);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userWithProfile));
      await cacheProfile(userWithProfile);
      return userWithProfile;
    } catch (error) {
      const message = "Unable to connect your account. Please try again.";
      setUser(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setAuthError(message);
      throw new Error(message, { cause: error });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const saveCustomerName = async (name) => {
    if (!user?.phone) throw new Error("Log in to save your name.");
    const nextUser = { ...user, name: String(name || "").trim() };
    if (!nextUser.name) throw new Error("Enter your name to continue.");
    const profile = await withDeadline(updateCustomerName(user.phone, nextUser.name), PROFILE_SYNC_TIMEOUT_MS);
    Object.assign(nextUser, profile);
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    await cacheProfile(nextUser);
    return nextUser;
  };

  const logout = () => {
    setUser(null);
    setAuthError("");
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  const refreshProfile = async () => {
    if (!user?.phone) return user;
    try {
      const profile = await withDeadline(getCustomerProfile(user.phone), PROFILE_SYNC_TIMEOUT_MS);
      if (!profile) return user;
      const nextUser = { ...user, ...profile };
      setUser(nextUser);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      await cacheProfile(nextUser);
      return nextUser;
    } catch {
      return user;
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      isHydrated,
      isLoggingIn,
      authError,
      login,
      saveCustomerName,
      refreshProfile,
      logout,
    }),
    [user, isHydrated, isLoggingIn, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
