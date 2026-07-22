import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMenuData } from "./MenuDataContext";
import { normalizePaymentMethods, resolvePaymentMethodId } from "../lib/restaurantData";

const PaymentContext = createContext(null);
const STORAGE_KEY = "smartrest_payment_method";

const NOTES = {
  cod: "Pay with cash when your order arrives.",
  upi: "Pay via GPay, PhonePe, Paytm or any UPI app at checkout.",
};

export function PaymentProvider({ children }) {
  const { profile } = useMenuData();
  const [methodId, setMethodId] = useState("cod");
  const [isHydrated, setIsHydrated] = useState(false);

  const methods = useMemo(() => {
    return normalizePaymentMethods(profile?.paymentMethods).map((method) => ({
      ...method,
      note: NOTES[method.id] ?? "",
    }));
  }, [profile]);
  const resolvedMethodId = resolvePaymentMethodId(methodId, methods);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setMethodId(stored);
      } catch {
        // ignore corrupt storage
      }
      setIsHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, resolvedMethodId).catch(() => {});
  }, [resolvedMethodId, isHydrated]);

  const value = useMemo(() => {
    const method = methods.find((candidate) => candidate.id === resolvedMethodId) ?? methods[0];
    return {
      methodId: resolvedMethodId,
      setMethodId,
      method,
      methods,
      isHydrated,
    };
  }, [resolvedMethodId, methods, isHydrated]);

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
}

export const usePayment = () => useContext(PaymentContext);
