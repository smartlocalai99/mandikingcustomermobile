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

async function clearCachedProfile(phone) {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    const profiles = raw ? JSON.parse(raw) : {};
    if (!profiles?.[phone]) return;
    delete profiles[phone];
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profiles));
  } catch {
    // Cache cleanup is best effort; the server profile remains authoritative.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");

  const applySyncedProfile = async (phone, profile) => {
    if (!profile) return;
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (normalizePhone(parsed.phone) !== phone) return;

    const nextUser = {
      phone,
      // A blank server name is authoritative. Never resurrect a stale local
      // name (for example one copied from another app/account).
      name: profile.name || "",
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    if (nextUser.name) await cacheProfile(nextUser);
    else await clearCachedProfile(phone);
    setUser((current) => (current?.phone === phone ? nextUser : current));
  };

  const syncProfileInBackground = (phone, options = {}) => {
    void withDeadline(upsertCustomer(phone, options), PROFILE_SYNC_TIMEOUT_MS)
      .then((profile) => applySyncedProfile(phone, profile))
      .catch(() => {
        // The phone-number session remains valid offline. This request only
        // keeps the optional Supabase profile in sync.
        setAuthError("Customer data will sync when the connection returns.");
      });
  };

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
          if (active) syncProfileInBackground(normalizedPhone);
        }
      } catch {
        if (active) {
          setAuthError("Your saved session could not be restored. Enter your mobile number again.");
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
      if (nextUser.name) await cacheProfile(nextUser);
      syncProfileInBackground(normalizedPhone, { name });
      return nextUser;
    } catch {
      // Face ID already unlocked this in-memory phone session. A local
      // persistence failure must not turn it into a network-style login.
      setAuthError("This session may need your mobile number again after the app closes.");
      syncProfileInBackground(normalizedPhone, { name });
      return nextUser;
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
