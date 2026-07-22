import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizePhone, updateCustomerName, upsertCustomer } from "../lib/customerData";

const AuthContext = createContext(null);
const STORAGE_KEY = "smartrest_auth";

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
          const profile = await upsertCustomer(normalizedPhone);
          if (active) setUser({ ...profile, phone: normalizedPhone });
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
    const nextUser = { phone: normalizedPhone };
    setIsLoggingIn(true);
    setAuthError("");

    try {
      const profile = await upsertCustomer(normalizedPhone, { name });
      const userWithProfile = { ...nextUser, ...profile };
      setUser(userWithProfile);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userWithProfile));
      return userWithProfile;
    } catch (error) {
      const message = "Unable to connect your account. Please try again.";
      setUser(null);
      setAuthError(message);
      throw new Error(message, { cause: error });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const saveCustomerName = async (name) => {
    if (!user?.phone) throw new Error("Log in to save your name.");
    const profile = await updateCustomerName(user.phone, name);
    const nextUser = { ...user, ...profile };
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    return nextUser;
  };

  const logout = () => {
    setUser(null);
    setAuthError("");
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
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
      logout,
    }),
    [user, isHydrated, isLoggingIn, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
