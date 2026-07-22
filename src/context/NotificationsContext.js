import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Notifications from "expo-notifications";
import { getSupabase } from "../lib/supabase";
import {
  listCustomerNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushToken,
  syncBadgeCount,
} from "../lib/notificationsData";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const client = useMemo(() => getSupabase(), []);
  const { user, isLoggedIn } = useAuth();
  const phone = user?.phone;
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    import("expo-notifications")
      .then((Notifications) => {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      })
      .catch(() => {});
  }, []);

  const refresh = async () => {
    if (!phone) return;
    try {
      const rows = await listCustomerNotifications(phone, client);
      setNotifications(rows);
    } catch {
      // Keep whatever list was already loaded.
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !phone) {
      setNotifications([]);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    listCustomerNotifications(phone, client)
      .then((rows) => {
        if (!cancelled) setNotifications(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    registerPushToken(client).catch(() => {});

    const channel = client
      .channel(`customer-notifications-${phone}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_notifications", filter: `customer_phone=eq.${phone}` },
        () => {
          if (!cancelled) refresh();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, phone, client]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const subscription = Notifications.addPushTokenListener(() => {
      registerPushToken(client).catch(() => {});
    });
    return () => subscription.remove();
  }, [isLoggedIn, client]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    syncBadgeCount(unreadCount);
  }, [unreadCount]);

  const markRead = async (id) => {
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await markNotificationRead(id, client);
    } catch {
      refresh();
    }
  };

  const markAllRead = async () => {
    if (!phone) return;
    setNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead(phone, client);
    } catch {
      refresh();
    }
  };

  const value = useMemo(
    () => ({ notifications, unreadCount, isLoading, markRead, markAllRead, refresh }),
    [notifications, unreadCount, isLoading]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
