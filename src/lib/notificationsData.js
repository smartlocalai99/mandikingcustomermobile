import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getSupabase } from "./supabase";
import {
  getInstallationId,
  registerForPushNotifications,
  submitPushRegistration,
} from "./pushRegistration.mjs";

export async function registerPushToken(client = getSupabase()) {
  // Recent iOS simulators can receive remote notifications. Android emulator
  // verification still requires Google Play services and FCM credentials.
  if (!Device.isDevice && Platform.OS !== "ios") return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  const installationId = await getInstallationId(AsyncStorage, Crypto.randomUUID);

  return registerForPushNotifications({
    notifications: Notifications,
    projectId,
    platform: Platform.OS,
    installationId,
    androidImportance: Notifications.AndroidImportance.MAX,
    submit: (registration) => submitPushRegistration(client, registration),
  });
}

export async function syncBadgeCount(count) {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Some runtimes do not expose badge APIs; notification delivery still works.
  }
}
