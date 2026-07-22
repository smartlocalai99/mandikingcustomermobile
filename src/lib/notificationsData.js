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

function notificationFromRow(row) {
  return {
    id: row.id,
    broadcastId: row.broadcast_id,
    title: row.title,
    body: row.body,
    offerId: row.offer_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function listCustomerNotifications(phone, client = getSupabase()) {
  const { data, error } = await client
    .from("customer_notifications")
    .select("*")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(notificationFromRow);
}

export async function markNotificationRead(id, client = getSupabase()) {
  const { error } = await client.from("customer_notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(phone, client = getSupabase()) {
  const { error } = await client
    .from("customer_notifications")
    .update({ is_read: true })
    .eq("customer_phone", phone)
    .eq("is_read", false);
  if (error) throw error;
}

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
    const Notifications = await import("expo-notifications");
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // Badge API is unavailable in Expo Go on some platforms — ignore.
  }
}
