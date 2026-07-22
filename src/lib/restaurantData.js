import { getSupabase } from "./supabase";

export const SUPPORTED_PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", enabled: true },
  { id: "upi", label: "UPI", enabled: true },
];

export function normalizePaymentMethods(methods) {
  const supportedIds = new Set(SUPPORTED_PAYMENT_METHODS.map((method) => method.id));
  const normalized = (Array.isArray(methods) ? methods : [])
    .filter(
      (method, index, list) =>
        supportedIds.has(method?.id) &&
        method.enabled !== false &&
        list.findIndex((candidate) => candidate?.id === method.id) === index
    )
    .map((method) => ({
      ...method,
      label:
        String(method.label || "").trim() ||
        SUPPORTED_PAYMENT_METHODS.find((fallback) => fallback.id === method.id).label,
    }));

  return normalized.length > 0
    ? normalized
    : SUPPORTED_PAYMENT_METHODS.map((method) => ({ ...method }));
}

export function resolvePaymentMethodId(methodId, methods) {
  return methods.some((method) => method.id === methodId)
    ? methodId
    : methods[0]?.id ?? "cod";
}

export function profileFromRow(row) {
  return {
    name: row.name,
    description: row.description ?? "",
    phone: row.phone ?? "",
    addressLine: row.address_line ?? "",
    lat: row.lat,
    lng: row.lng,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    isOpen: row.is_open,
    busyMode: row.busy_mode,
    minOrderAmount: Number(row.min_order_amount),
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    prepTimeMinutes: row.prep_time_minutes,
    deliveryBaseKm: Number(row.delivery_base_km),
    deliveryBaseFee: Number(row.delivery_base_fee),
    deliveryPerKmFee: Number(row.delivery_per_km_fee),
    freeDeliveryMinAmount:
      row.free_delivery_min_amount == null ? null : Number(row.free_delivery_min_amount),
    paymentMethods: normalizePaymentMethods(row.payment_methods),
  };
}

export async function getRestaurantProfile(client = getSupabase()) {
  const { data, error } = await client.from("restaurant_profile").select("*").eq("id", 1).single();
  if (error) throw error;
  return profileFromRow(data);
}

function itemFromRow(row) {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    description: row.description ?? "",
    price: Number(row.price),
    oldPrice: row.old_price == null ? null : Number(row.old_price),
    imageUrl: row.image_url,
    isVeg: row.is_veg,
    isBestseller: row.is_bestseller,
    isAvailable: row.is_available,
    prepTimeMinutes: row.prep_time_minutes,
    badgeText: row.badge_text || "",
  };
}

export async function listActiveMenu(client = getSupabase()) {
  const [{ data: sections, error: sectionsError }, { data: items, error: itemsError }] = await Promise.all([
    client
      .from("menu_sections")
      .select("id, title, display_order, badge_text")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    client.from("menu_items").select("*").order("display_order", { ascending: true }),
  ]);
  if (sectionsError) throw sectionsError;
  if (itemsError) throw itemsError;

  const itemsBySection = new Map();
  for (const row of items) {
    const item = itemFromRow(row);
    const list = itemsBySection.get(item.sectionId) ?? [];
    list.push(item);
    itemsBySection.set(item.sectionId, list);
  }

  return sections
    .map((row) => ({
      id: row.id,
      heading: row.title,
      badgeText: row.badge_text || "",
      items: itemsBySection.get(row.id) ?? [],
    }))
    .filter((section) => section.items.length > 0);
}

function offerFromRow(row) {
  const items = (row.offer_items ?? [])
    .map((link) => link.menu_items)
    .filter(Boolean)
    .map(itemFromRow);

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    imageUrl: row.image_url,
    strikePrice: row.strike_price == null ? null : Number(row.strike_price),
    salePrice: row.sale_price == null ? null : Number(row.sale_price),
    items,
  };
}

export async function listActiveOffers(client = getSupabase()) {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("offers")
    .select("*, offer_items(menu_item_id, menu_items(*))")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(offerFromRow).filter((offer) => offer.items.length > 0);
}

function categoryFromRow(row) {
  return {
    id: row.id,
    label: row.label,
    imageUrl: row.image_url,
    sectionId: row.section_id,
  };
}

export async function listActiveCategories(client = getSupabase()) {
  const { data, error } = await client
    .from("menu_categories")
    .select("id, label, image_url, section_id")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(categoryFromRow);
}
