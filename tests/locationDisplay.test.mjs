import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayLocation } from "../src/lib/locationDisplay.mjs";

test("prefers the saved authenticated address, then confirmed onboarding location", () => {
  assert.equal(
    getDisplayLocation({ defaultAddress: { line: "12 Main Street" }, savedLocation: { landmark: "Kadapa" } }),
    "12 Main Street",
  );
  assert.equal(getDisplayLocation({ savedLocation: { landmark: "Kadapa" } }), "Kadapa");
  assert.equal(getDisplayLocation({ savedLocation: { line: "Near Mandi Kings, Kadapa" } }), "Near Mandi Kings");
});
