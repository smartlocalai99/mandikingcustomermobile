import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { requestForegroundLocation, reverseGeocodeCoordinates } from "../lib/locationPermissions.mjs";
import { shouldShowOnboarding } from "../lib/onboardingState.mjs";

const STORAGE_KEY = "smartrest_first_launch_onboarding";
const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [snapshot, setSnapshot] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [locationState, setLocationState] = useState({ status: "idle", address: null, error: null });

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        try {
          setSnapshot(stored ? JSON.parse(stored) : null);
        } catch {
          setSnapshot(null);
        }
      })
      .catch(() => {
        if (active) setSnapshot(null);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const requestNotifications = useCallback(async () => {
    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.status === "granted"
      ? existing
      : await Notifications.requestPermissionsAsync();
    return ["granted", "provisional"].includes(permission.status);
  }, []);

  const requestLocation = useCallback(async () => {
    setLocationState({ status: "loading", address: null, error: null });
    try {
      const address = await requestForegroundLocation({
        permissions: {
          getForegroundPermissionsAsync: () => Location.getForegroundPermissionsAsync(),
          requestForegroundPermissionsAsync: () => Location.requestForegroundPermissionsAsync(),
        },
        getCurrentPositionAsync: (options) => Location.getCurrentPositionAsync(options),
        reverseGeocode: (latitude, longitude) => reverseGeocodeCoordinates(latitude, longitude),
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationState({ status: "ready", address, error: null });
      return address;
    } catch (error) {
      setLocationState({ status: "error", address: null, error });
      throw error;
    }
  }, []);

  const completeOnboarding = useCallback(async (location = null) => {
    const nextSnapshot = { completed: true, location, completedAt: new Date().toISOString() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSnapshot));
    setSnapshot(nextSnapshot);
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      needsOnboarding: isReady && shouldShowOnboarding(snapshot),
      locationState,
      savedLocation: snapshot?.location ?? null,
      requestNotifications,
      requestLocation,
      completeOnboarding,
    }),
    [completeOnboarding, isReady, locationState, requestLocation, requestNotifications, snapshot]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
  return context;
}
