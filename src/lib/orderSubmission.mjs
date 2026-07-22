export const ORDER_VALIDATION_ERRORS = {
  EMPTY_CART: "EMPTY_CART",
  ADDRESS_REQUIRED: "ADDRESS_REQUIRED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  RESTAURANT_UNAVAILABLE: "RESTAURANT_UNAVAILABLE",
  MIN_ORDER_NOT_MET: "MIN_ORDER_NOT_MET",
};

const ERROR_MESSAGES = {
  [ORDER_VALIDATION_ERRORS.EMPTY_CART]: "Your basket is empty.",
  [ORDER_VALIDATION_ERRORS.ADDRESS_REQUIRED]: "Add a delivery address to continue.",
  [ORDER_VALIDATION_ERRORS.PAYMENT_REQUIRED]: "Choose how you'd like to pay.",
  [ORDER_VALIDATION_ERRORS.RESTAURANT_UNAVAILABLE]: "The restaurant isn't accepting orders right now.",
  [ORDER_VALIDATION_ERRORS.MIN_ORDER_NOT_MET]: "Add more items to meet the minimum order amount.",
};

function fail(type) {
  return { ok: false, error: { type, message: ERROR_MESSAGES[type] } };
}

function randomOrderId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Validates a checkout attempt and, if valid, returns the exact payload
 * `createOrder` should insert. Never throws — every rejection reason is a
 * typed, user-presentable error so the caller can render it directly.
 */
export function buildOrderPayload({
  cartItems,
  totals,
  address,
  paymentMethod,
  profile = null,
  now = () => new Date().toISOString(),
  generateId = randomOrderId,
}) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return fail(ORDER_VALIDATION_ERRORS.EMPTY_CART);
  if (!address) return fail(ORDER_VALIDATION_ERRORS.ADDRESS_REQUIRED);
  if (!paymentMethod) return fail(ORDER_VALIDATION_ERRORS.PAYMENT_REQUIRED);
  if (profile && (profile.busyMode || profile.isOpen === false)) {
    return fail(ORDER_VALIDATION_ERRORS.RESTAURANT_UNAVAILABLE);
  }

  const subtotal = Number(totals?.subtotal ?? 0);
  const discount = Number(totals?.discount ?? 0);
  const deliveryFee = Number(totals?.deliveryFee ?? 0);
  const totalItems = Number(totals?.totalItems ?? 0);

  if (profile?.minOrderAmount && subtotal > 0 && subtotal < profile.minOrderAmount) {
    return fail(ORDER_VALIDATION_ERRORS.MIN_ORDER_NOT_MET);
  }

  return {
    ok: true,
    payload: {
      id: generateId(),
      items: cartItems,
      totalItems,
      subtotal,
      discount,
      deliveryFee,
      total: Math.max(subtotal - discount + deliveryFee, 0),
      status: "preparing",
      deliveryAddress: address,
      paymentMethod,
      placedAt: now(),
    },
  };
}

/** Defensive normalization for whatever createOrder resolves with. */
export function normalizeSavedOrder(row) {
  return {
    id: String(row?.id ?? ""),
    items: Array.isArray(row?.items) ? row.items : [],
    totalItems: Number(row?.totalItems ?? 0) || 0,
    subtotal: Number(row?.subtotal ?? 0) || 0,
    discount: Number(row?.discount ?? 0) || 0,
    deliveryFee: Number(row?.deliveryFee ?? 0) || 0,
    total: Number(row?.total ?? 0) || 0,
    status: row?.status || "preparing",
    deliveryAddress: row?.deliveryAddress ?? {},
    paymentMethod: row?.paymentMethod ?? null,
    placedAt: row?.placedAt ?? null,
  };
}
