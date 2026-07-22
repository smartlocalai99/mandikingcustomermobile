import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderPayload, normalizeSavedOrder, ORDER_VALIDATION_ERRORS } from "../src/lib/orderSubmission.mjs";

const CART_ITEMS = [
  { item: { id: "a", title: "Chicken 65", price: 220 }, quantity: 1, sectionTitle: "Starters" },
];
const TOTALS = { totalItems: 1, subtotal: 220, discount: 0, deliveryFee: 40 };
const ADDRESS = { id: "addr-1", line: "12 MG Road", phone: "9876543210" };
const PAYMENT_METHOD = { id: "cod", label: "Cash on Delivery" };

test("rejects an empty cart", () => {
  const result = buildOrderPayload({ cartItems: [], totals: TOTALS, address: ADDRESS, paymentMethod: PAYMENT_METHOD });
  assert.equal(result.ok, false);
  assert.equal(result.error.type, ORDER_VALIDATION_ERRORS.EMPTY_CART);
});

test("rejects a missing delivery address", () => {
  const result = buildOrderPayload({ cartItems: CART_ITEMS, totals: TOTALS, address: null, paymentMethod: PAYMENT_METHOD });
  assert.equal(result.ok, false);
  assert.equal(result.error.type, ORDER_VALIDATION_ERRORS.ADDRESS_REQUIRED);
});

test("rejects a missing payment method", () => {
  const result = buildOrderPayload({ cartItems: CART_ITEMS, totals: TOTALS, address: ADDRESS, paymentMethod: null });
  assert.equal(result.ok, false);
  assert.equal(result.error.type, ORDER_VALIDATION_ERRORS.PAYMENT_REQUIRED);
});

test("rejects when the restaurant is closed or busy", () => {
  const closed = buildOrderPayload({
    cartItems: CART_ITEMS,
    totals: TOTALS,
    address: ADDRESS,
    paymentMethod: PAYMENT_METHOD,
    profile: { isOpen: false, busyMode: false, minOrderAmount: 0 },
  });
  assert.equal(closed.error.type, ORDER_VALIDATION_ERRORS.RESTAURANT_UNAVAILABLE);

  const busy = buildOrderPayload({
    cartItems: CART_ITEMS,
    totals: TOTALS,
    address: ADDRESS,
    paymentMethod: PAYMENT_METHOD,
    profile: { isOpen: true, busyMode: true, minOrderAmount: 0 },
  });
  assert.equal(busy.error.type, ORDER_VALIDATION_ERRORS.RESTAURANT_UNAVAILABLE);
});

test("rejects a subtotal below the restaurant's minimum order amount", () => {
  const result = buildOrderPayload({
    cartItems: CART_ITEMS,
    totals: TOTALS,
    address: ADDRESS,
    paymentMethod: PAYMENT_METHOD,
    profile: { isOpen: true, busyMode: false, minOrderAmount: 500 },
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.type, ORDER_VALIDATION_ERRORS.MIN_ORDER_NOT_MET);
});

test("builds a normalized, deterministic payload for a valid checkout", () => {
  const result = buildOrderPayload({
    cartItems: CART_ITEMS,
    totals: TOTALS,
    address: ADDRESS,
    paymentMethod: PAYMENT_METHOD,
    profile: { isOpen: true, busyMode: false, minOrderAmount: 100 },
    generateId: () => "ABC123",
    now: () => "2026-07-23T10:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, {
    id: "ABC123",
    items: CART_ITEMS,
    totalItems: 1,
    subtotal: 220,
    discount: 0,
    deliveryFee: 40,
    total: 260,
    status: "preparing",
    deliveryAddress: ADDRESS,
    paymentMethod: PAYMENT_METHOD,
    placedAt: "2026-07-23T10:00:00.000Z",
  });
});

test("clamps a total that would otherwise go negative", () => {
  const result = buildOrderPayload({
    cartItems: CART_ITEMS,
    totals: { totalItems: 1, subtotal: 100, discount: 150, deliveryFee: 0 },
    address: ADDRESS,
    paymentMethod: PAYMENT_METHOD,
  });
  assert.equal(result.payload.total, 0);
});

test("normalizes a saved order row with coerced numbers and safe defaults", () => {
  const normalized = normalizeSavedOrder({
    id: 42,
    total: "260",
    subtotal: "220",
    discount: null,
    deliveryFee: undefined,
    totalItems: "1",
    status: undefined,
    items: null,
  });

  assert.deepEqual(normalized, {
    id: "42",
    items: [],
    totalItems: 1,
    subtotal: 220,
    discount: 0,
    deliveryFee: 0,
    total: 260,
    status: "preparing",
    deliveryAddress: {},
    paymentMethod: null,
    placedAt: null,
  });
});
