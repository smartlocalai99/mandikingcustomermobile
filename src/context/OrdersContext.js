import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { createOrder, listOrders } from "../lib/customerData";
import { normalizeSavedOrder } from "../lib/orderSubmission.mjs";

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const { user, isHydrated: isAuthHydrated } = useAuth();
  const phone = user?.phone;
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  const refreshOrders = async () => {
    if (!phone) return [];
    setIsLoadingOrders(true);
    setOrdersError("");
    try {
      const remoteOrders = await listOrders(phone);
      setOrders(remoteOrders);
      return remoteOrders;
    } catch (error) {
      setOrdersError("Could not load your orders. Please try again.");
      throw error;
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!isAuthHydrated) return undefined;
    let active = true;

    async function loadOrders() {
      if (!phone) {
        if (active) {
          setOrders([]);
          setOrdersError("");
          setIsLoadingOrders(false);
        }
        return;
      }

      setIsLoadingOrders(true);
      setOrdersError("");
      try {
        const remoteOrders = await listOrders(phone);
        if (active) setOrders(remoteOrders);
      } catch {
        if (active) setOrdersError("Could not load your orders. Please try again.");
      } finally {
        if (active) setIsLoadingOrders(false);
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, [isAuthHydrated, phone]);

  const placeOrder = async (order) => {
    if (!phone) throw new Error("Log in to place an order.");
    setOrdersError("");
    try {
      const savedOrder = normalizeSavedOrder(await createOrder(phone, order));
      // Local state (and therefore the Orders tab) only changes once the
      // insert has actually succeeded — a failed request leaves it untouched.
      setOrders((current) => [savedOrder, ...current]);
      return savedOrder;
    } catch (error) {
      setOrdersError("Could not place your order. Your cart is still safe.");
      throw error;
    }
  };

  const value = {
    orders,
    placeOrder,
    refreshOrders,
    isLoadingOrders,
    ordersError,
  };

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export const useOrders = () => useContext(OrdersContext);
