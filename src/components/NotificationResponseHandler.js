import { useCallback, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useCart } from "../context/CartContext";
import { useMenuData } from "../context/MenuDataContext";
import { useNotifications } from "../context/NotificationsContext";
import { notificationRoute } from "../lib/notificationRouting.mjs";

export default function NotificationResponseHandler({ navigationRef }) {
  const { offers, isLoading } = useMenuData();
  const { applyOffer } = useCart();
  const { ingestPush } = useNotifications();
  const handled = useRef(new Set());
  const pending = useRef(null);

  const handle = useCallback(
    (notification) => {
      const id = notification?.request?.identifier;
      if (id && handled.current.has(id)) return;

      const route = notificationRoute(notification?.request?.content);
      if (route.kind === "offer") {
        if (isLoading) {
          pending.current = notification;
          return;
        }

        const offer = offers.find((candidate) => candidate.id === route.offerId);
        if (offer) {
          if (id) handled.current.add(id);
          applyOffer(offer);
          navigationRef.navigate("Checkout");
          return;
        }
      }

      if (id) handled.current.add(id);
      ingestPush(notification?.request?.content, id);
      navigationRef.navigate("MainTabs", {
        screen: "Home",
        params: { openNotifications: true },
      });
    },
    [applyOffer, ingestPush, isLoading, navigationRef, offers]
  );

  useEffect(() => {
    if (!isLoading && pending.current) {
      const notification = pending.current;
      pending.current = null;
      handle(notification);
    }
  }, [handle, isLoading]);

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification) handle(response.notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handle(response.notification);
      }
    );
    const receiveSubscription = Notifications.addNotificationReceivedListener((notification) => {
      ingestPush(notification.request.content, notification.request.identifier);
    });

    return () => {
      responseSubscription.remove();
      receiveSubscription.remove();
    };
  }, [handle, ingestPush]);

  return null;
}
