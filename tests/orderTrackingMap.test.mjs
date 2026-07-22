import assert from "node:assert/strict";
import test from "node:test";
import { buildMapsUrl, getOrderMapEndpoints } from "../src/lib/orderTrackingMap.mjs";

const RESTAURANT = { name: "Mandi Kings", lat: 14.4753, lng: 78.8298 };
const DELIVERY_ADDRESS = { line: "12 MG Road", lat: 14.48, lng: 78.83 };

test("resolves both endpoints and a route when coordinates are complete", () => {
  const endpoints = getOrderMapEndpoints({ restaurant: RESTAURANT, deliveryAddress: DELIVERY_ADDRESS });

  assert.equal(endpoints.hasRoute, true);
  assert.deepEqual(endpoints.restaurant.coordinate, { latitude: 14.4753, longitude: 78.8298 });
  assert.deepEqual(endpoints.customer.coordinate, { latitude: 14.48, longitude: 78.83 });
  assert.equal(endpoints.restaurant.label, "Mandi Kings");
  assert.equal(endpoints.customer.label, "12 MG Road");
});

test("has no route when the customer address is missing coordinates", () => {
  const endpoints = getOrderMapEndpoints({
    restaurant: RESTAURANT,
    deliveryAddress: { line: "12 MG Road", lat: null, lng: null },
  });

  assert.equal(endpoints.hasRoute, false);
  assert.equal(endpoints.customer.coordinate, null);
  assert.notEqual(endpoints.restaurant.coordinate, null);
});

test("has no route when the restaurant profile has no coordinates at all", () => {
  const endpoints = getOrderMapEndpoints({ restaurant: null, deliveryAddress: DELIVERY_ADDRESS });
  assert.equal(endpoints.hasRoute, false);
  assert.equal(endpoints.restaurant.coordinate, null);
});

test("falls back to generic labels when names are blank", () => {
  const endpoints = getOrderMapEndpoints({ restaurant: {}, deliveryAddress: {} });
  assert.equal(endpoints.restaurant.label, "Restaurant");
  assert.equal(endpoints.customer.label, "Delivery address");
});

test("builds an Apple Maps URL on iOS when a route exists", () => {
  const endpoints = getOrderMapEndpoints({ restaurant: RESTAURANT, deliveryAddress: DELIVERY_ADDRESS });
  const url = buildMapsUrl(endpoints, "ios");
  assert.equal(url, "https://maps.apple.com/?saddr=14.4753,78.8298&daddr=14.48,78.83&dirflg=d");
});

test("builds a Google Maps URL on android when a route exists", () => {
  const endpoints = getOrderMapEndpoints({ restaurant: RESTAURANT, deliveryAddress: DELIVERY_ADDRESS });
  const url = buildMapsUrl(endpoints, "android");
  assert.equal(
    url,
    "https://www.google.com/maps/dir/?api=1&origin=14.4753,78.8298&destination=14.48,78.83&travelmode=driving"
  );
});

test("returns null when there is no complete route", () => {
  const endpoints = getOrderMapEndpoints({ restaurant: null, deliveryAddress: DELIVERY_ADDRESS });
  assert.equal(buildMapsUrl(endpoints, "ios"), null);
});
