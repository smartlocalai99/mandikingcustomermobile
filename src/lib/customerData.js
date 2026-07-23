import { getSupabase } from "./supabase";
import { normalizeAddressInput, normalizeCustomerProfile } from "./customerProfile.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizePhone(phone) {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (!/^\d{10}$/.test(digits)) {
    throw new Error("Enter a valid ten-digit mobile number.");
  }
  return digits;
}

export function addressToRow(customerPhone, address) {
  const normalized = normalizeAddressInput(address);
  return {
    ...(normalized.id ? { id: normalized.id } : {}),
    customer_phone: normalizePhone(customerPhone),
    label: normalized.label,
    address_line: normalized.line,
    landmark: normalized.landmark || null,
    contact_phone: normalized.phone || null,
    is_default: normalized.isDefault,
    lat: normalized.lat,
    lng: normalized.lng,
  };
}

export function addressFromRow(row) {
  return {
    id: row.id,
    label: row.label,
    line: row.address_line,
    landmark: row.landmark ?? "",
    phone: row.contact_phone ?? "",
    isDefault: Boolean(row.is_default),
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  };
}

export function orderToRow(customerPhone, order) {
  return {
    id: order.id,
    customer_phone: normalizePhone(customerPhone),
    items: order.items ?? [],
    total_items: Number(order.totalItems ?? 0),
    subtotal: Number(order.subtotal ?? order.total ?? 0),
    discount: Number(order.discount ?? 0),
    delivery_fee: Number(order.deliveryFee ?? 0),
    total: Number(order.total ?? 0),
    status: order.status ?? "preparing",
    delivery_address: order.deliveryAddress ?? {},
    payment_method: order.paymentMethod ?? null,
    placed_at: order.placedAt ?? new Date().toISOString(),
    ordered_at: order.orderedAt ?? order.placedAt ?? new Date().toISOString(),
    picked_up_at: order.pickedUpAt ?? null,
    delivered_at: order.deliveredAt ?? null,
  };
}

export function orderFromRow(row) {
  return {
    id: row.id,
    items: row.items ?? [],
    totalItems: Number(row.total_items),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    status: row.status,
    deliveryAddress: row.delivery_address ?? {},
    paymentMethod: row.payment_method ?? null,
    placedAt: row.placed_at,
    orderedAt: row.ordered_at ?? row.placed_at,
    pickedUpAt: row.picked_up_at ?? null,
    deliveredAt: row.delivered_at ?? null,
  };
}

function throwIfError(error) {
  if (error) throw error;
}

export async function upsertCustomer(phone, profile = {}, client = getSupabase()) {
  const normalized = normalizePhone(phone);
  const normalizedProfile = normalizeCustomerProfile({ phone: normalized, ...profile });
  // Use the same single-request login path as the customer web app. Omitting
  // `name` preserves an existing name on conflict, while a new phone receives
  // a row immediately. This avoids a mobile-only lookup→insert gap.
  const payload = {
    phone: normalized,
    updated_at: new Date().toISOString(),
    ...(normalizedProfile.name ? { name: normalizedProfile.name } : {}),
  };
  const { data, error } = await client
    .from("customers")
    .upsert(payload, { onConflict: "phone" })
    .select("phone, name")
    .single();
  throwIfError(error);
  const saved = normalizeCustomerProfile(data);
  return { ...saved, isNew: !saved.name };
}

// Read-only profile refresh used when the app was restored from local storage.
// It avoids treating a slow first request as a blank customer profile.
export async function getCustomerProfile(phone, client = getSupabase()) {
  const normalized = normalizePhone(phone);
  const { data, error } = await client
    .from("customers")
    .select("phone, name")
    .eq("phone", normalized)
    .maybeSingle();
  throwIfError(error);
  return data ? normalizeCustomerProfile(data) : null;
}

export async function updateCustomerName(phone, name, client = getSupabase()) {
  const normalized = normalizePhone(phone);
  const profile = normalizeCustomerProfile({ phone: normalized, name });
  if (!profile.name) throw new Error("Enter your name to continue.");
  const { data, error } = await client.from("customers").update({ name: profile.name }).eq("phone", normalized).select().single();
  throwIfError(error);
  return normalizeCustomerProfile(data);
}

export async function listAddresses(phone, client = getSupabase()) {
  const { data, error } = await client
    .from("customer_addresses")
    .select("*")
    .eq("customer_phone", normalizePhone(phone))
    .order("created_at", { ascending: true });
  throwIfError(error);
  return (data ?? []).map(addressFromRow);
}

export async function createAddress(phone, address, client = getSupabase()) {
  const row = addressToRow(phone, address);
  if (row.id && !UUID_PATTERN.test(row.id)) delete row.id;
  const insertAddress = async (payload) => {
    const { data, error } = await client.from("customer_addresses").insert(payload).select().single();
    return { data, error };
  };
  let result = await insertAddress(row);
  // If local state was stale and another default already exists, preserve the
  // new address instead of failing the entire save on the partial unique index.
  if (result.error?.code === "23505" && row.is_default) {
    result = await insertAddress({ ...row, is_default: false });
  }
  throwIfError(result.error);
  return addressFromRow(result.data);
}

export async function updateAddress(phone, id, address, client = getSupabase()) {
  const { id: ignoredId, customer_phone: ignoredPhone, ...changes } = addressToRow(phone, address);
  void ignoredId;
  void ignoredPhone;
  const { data, error } = await client
    .from("customer_addresses")
    .update(changes)
    .eq("customer_phone", normalizePhone(phone))
    .eq("id", id)
    .select()
    .single();
  throwIfError(error);
  return addressFromRow(data);
}

export async function deleteAddress(phone, id, client = getSupabase()) {
  const { error } = await client
    .from("customer_addresses")
    .delete()
    .eq("customer_phone", normalizePhone(phone))
    .eq("id", id);
  throwIfError(error);
}

export async function makeDefaultAddress(phone, id, client = getSupabase()) {
  const normalized = normalizePhone(phone);
  const { error: clearError } = await client
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("customer_phone", normalized);
  throwIfError(clearError);

  const { data, error } = await client
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("customer_phone", normalized)
    .eq("id", id)
    .select()
    .single();
  throwIfError(error);
  return addressFromRow(data);
}

export async function listOrders(phone, client = getSupabase()) {
  const { data, error } = await client
    .from("customer_orders")
    .select("*")
    .eq("customer_phone", normalizePhone(phone))
    .order("placed_at", { ascending: false });
  throwIfError(error);
  return (data ?? []).map(orderFromRow);
}

export async function createOrder(phone, order, client = getSupabase()) {
  const { data, error } = await client
    .from("customer_orders")
    .insert(orderToRow(phone, order))
    .select()
    .single();
  throwIfError(error);
  return orderFromRow(data);
}
