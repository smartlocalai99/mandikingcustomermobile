import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Notifications from "expo-notifications";
import { getSupabase } from "../lib/supabase";
import { registerPushToken, syncBadgeCount } from "../lib/notificationsData";
import { startPushRegistration } from "../lib/pushRegistration.mjs";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const client = useMemo(() => getSupabase(), []);
  const { isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    return startPushRegistration({
      register: () => registerPushToken(client),
      // The listener receives a native APNs/FCM token. Fetch a new Expo token
      // before submitting so the server always stores the correct token type.
      addPushTokenListener: (listener) => Notifications.addPushTokenListener(listener),
    });
  }, [client]);

  const ingestPush = useCallback((content = {}, identifier) => {
    const next = {
      id: identifier || `push-${Date.now()}`,
      title: typeof content.title === "string" ? content.title : "SmartRest",
      body: typeof content.body === "string" ? content.body : "",
      offerId: typeof content?.data?.offerId === "string" ? content.data.offerId : null,
      isRead: false,
      isTransient: true,
      createdAt: new Date().toISOString(),
    };
    setNotifications((current) =>
      current.some((item) => item.id === next.id) ? current : [next, ...current]
    );
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    syncBadgeCount(unreadCount);
  }, [unreadCount]);

  const refresh = useCallback(async () => {}, []);
  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading: false,
      ingestPush,
      markRead,
      markAllRead,
      refresh,
    }),
    [notifications, unreadCount, ingestPush, markRead, markAllRead, refresh]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
