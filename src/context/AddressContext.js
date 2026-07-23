import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  makeDefaultAddress,
  updateAddress as updateCustomerAddress,
} from "../lib/customerData";

const AddressContext = createContext(null);
const ADDRESSES_TIMEOUT_MS = 8000;

function withDeadline(promise, ms) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Addresses request timed out")), ms)),
  ]);
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
    const remoteAddresses = await withDeadline(listAddresses(phone), ADDRESSES_TIMEOUT_MS);
    setAddresses(remoteAddresses);
    return remoteAddresses;
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
        const remoteAddresses = await withDeadline(listAddresses(phone), ADDRESSES_TIMEOUT_MS);
        if (active) setAddresses(remoteAddresses);
      } catch {
        if (active) {
          setAddressError("Could not load your saved addresses. Please try again.");
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
      const saved = await createAddress(phone, {
        ...data,
        isDefault: addresses.length === 0,
      });
      setAddresses((current) => [...current, saved]);
      return saved;
    } catch (error) {
      setAddressError("Could not save your address. Please try again.");
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
      const saved = await updateCustomerAddress(phone, id, {
        ...data,
        isDefault: Boolean(currentAddress?.isDefault),
      });
      setAddresses((current) =>
        current.map((address) => (address.id === id ? saved : address))
      );
      return saved;
    } catch (error) {
      setAddressError("Could not update your address. Please try again.");
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
      await deleteAddress(phone, id);
      let remaining = await listAddresses(phone);
      if (removedWasDefault && remaining.length > 0) {
        await makeDefaultAddress(phone, remaining[0].id);
        remaining = await listAddresses(phone);
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
      await makeDefaultAddress(phone, id);
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
