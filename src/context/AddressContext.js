import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  makeDefaultAddress,
  upsertCustomer,
  updateAddress as updateCustomerAddress,
} from "../lib/customerData";

const AddressContext = createContext(null);
// Supabase can take a few seconds to wake from an idle state on a fresh
// install. Keep reads bounded, but give writes a longer window so a valid
// insert is not reported as failed while the server is still committing it.
const ADDRESSES_READ_TIMEOUT_MS = 15000;
const ADDRESSES_WRITE_TIMEOUT_MS = 60000;

function describeAddressError(error, fallback) {
  const code = typeof error?.code === "string" ? ` (${error.code})` : "";
  const detail = typeof error?.message === "string" ? ` ${error.message}` : "";
  return `${fallback}${code}${detail}`;
}

function withDeadline(task, ms) {
  return Promise.race([
    Promise.resolve().then(task),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Addresses request timed out")), ms)),
  ]);
}

async function requestAddresses(task, maxAttempts = 2, timeoutMs = ADDRESSES_READ_TIMEOUT_MS) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await withDeadline(task, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw lastError;
}

export function AddressProvider({ children }) {
  const { user, isHydrated: isAuthHydrated } = useAuth();
  const phone = user?.phone;
  const [addresses, setAddresses] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isMutatingAddress, setIsMutatingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  const refreshAddresses = async () => {
    if (!phone) {
      setAddresses([]);
      setIsLoadingAddresses(false);
      return [];
    }
    setIsLoadingAddresses(true);
    setAddressError("");
    try {
      const remoteAddresses = await requestAddresses(() => listAddresses(phone));
      setAddresses(remoteAddresses);
      return remoteAddresses;
    } catch (error) {
      setAddressError(describeAddressError(error, "Could not load your saved addresses."));
      throw error;
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (!isAuthHydrated) return undefined;
    let active = true;

    async function loadAddresses() {
      if (!phone) {
        if (active) {
          setAddresses([]);
          setAddressError("");
          setIsLoadingAddresses(false);
        }
        return;
      }

      setIsLoadingAddresses(true);
      setAddressError("");
      try {
        const remoteAddresses = await requestAddresses(() => listAddresses(phone));
        if (active) setAddresses(remoteAddresses);
      } catch (error) {
        if (active) {
          setAddressError(describeAddressError(error, "Could not load your saved addresses."));
        }
      } finally {
        if (active) setIsLoadingAddresses(false);
      }
    }

    loadAddresses();
    return () => {
      active = false;
    };
  }, [isAuthHydrated, phone]);

  const addAddress = async (data) => {
    if (!phone) throw new Error("Log in to save an address.");
    setIsMutatingAddress(true);
    setAddressError("");
    try {
      // Do not replay an INSERT after a timeout: the server may have accepted
      // it even if the response was lost. Reads and idempotent updates retry;
      // address creation runs exactly once to avoid duplicate rows.
      const addressData = { ...data, isDefault: addresses.length === 0 };
      let saved;
      try {
        saved = await requestAddresses(() => createAddress(phone, addressData), 1, ADDRESSES_WRITE_TIMEOUT_MS);
      } catch (error) {
        // A fresh local phone may not have completed its background customer
        // sync yet. Only recover from that specific FK error, then retry the
        // insert once; all other errors are surfaced immediately.
        if (error?.code !== "23503") throw error;
        await requestAddresses(() => upsertCustomer(phone, { name: user?.name || "" }), 1, ADDRESSES_WRITE_TIMEOUT_MS);
        saved = await requestAddresses(() => createAddress(phone, addressData), 1, ADDRESSES_WRITE_TIMEOUT_MS);
      }
      setAddresses((current) => [...current, saved]);
      return saved;
    } catch (error) {
      setAddressError(describeAddressError(error, "Could not save your address."));
      throw error;
    } finally {
      setIsMutatingAddress(false);
    }
  };

  const updateAddress = async (id, data) => {
    if (!phone) throw new Error("Log in to update an address.");
    setIsMutatingAddress(true);
    setAddressError("");
    try {
      const currentAddress = addresses.find((address) => address.id === id);
      const saved = await requestAddresses(() => updateCustomerAddress(phone, id, {
        ...data,
        isDefault: Boolean(currentAddress?.isDefault),
      }), 1, ADDRESSES_WRITE_TIMEOUT_MS);
      setAddresses((current) =>
        current.map((address) => (address.id === id ? saved : address))
      );
      return saved;
    } catch (error) {
      setAddressError(describeAddressError(error, "Could not update your address."));
      throw error;
    } finally {
      setIsMutatingAddress(false);
    }
  };

  const removeAddress = async (id) => {
    if (!phone) throw new Error("Log in to delete an address.");
    setIsMutatingAddress(true);
    setAddressError("");
    try {
      const removedWasDefault = addresses.find((address) => address.id === id)?.isDefault;
      await requestAddresses(() => deleteAddress(phone, id), 1, ADDRESSES_WRITE_TIMEOUT_MS);
      let remaining = await requestAddresses(() => listAddresses(phone));
      if (removedWasDefault && remaining.length > 0) {
        await requestAddresses(() => makeDefaultAddress(phone, remaining[0].id));
        remaining = await requestAddresses(() => listAddresses(phone));
      }
      setAddresses(remaining);
    } catch (error) {
      setAddressError("Could not delete your address. Please try again.");
      throw error;
    } finally {
      setIsMutatingAddress(false);
    }
  };

  const setDefault = async (id) => {
    if (!phone) throw new Error("Log in to choose a default address.");
    setIsMutatingAddress(true);
    setAddressError("");
    try {
      await requestAddresses(() => makeDefaultAddress(phone, id));
      await refreshAddresses();
    } catch (error) {
      setAddressError("Could not change your default address. Please try again.");
      throw error;
    } finally {
      setIsMutatingAddress(false);
    }
  };

  const value = {
    addresses,
    addAddress,
    updateAddress,
    removeAddress,
    setDefault,
    refreshAddresses,
    isLoadingAddresses,
    isMutatingAddress,
    addressError,
    defaultAddress: addresses.find((address) => address.isDefault) ?? addresses[0] ?? null,
  };

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export const useAddresses = () => useContext(AddressContext);
