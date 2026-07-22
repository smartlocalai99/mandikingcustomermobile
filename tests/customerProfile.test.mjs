import assert from "node:assert/strict";
import test from "node:test";
import { needsCustomerName, normalizeAddressInput, normalizeCustomerProfile } from "../src/lib/customerProfile.mjs";

test("normalizes customer profile and detects missing name", () => {
  assert.deepEqual(normalizeCustomerProfile({ phone: "+91 98765 43210", name: "  Vardhan  " }), { phone: "9876543210", name: "Vardhan" });
  assert.equal(needsCustomerName({ phone: "9876543210", name: "" }), true);
  assert.equal(needsCustomerName({ phone: "9876543210", name: "Vardhan" }), false);
});

test("normalizes address fields and nullable coordinates", () => {
  assert.deepEqual(normalizeAddressInput({ label: " Home ", line: "  Main Road ", phone: "+91 98765 43210", lat: "14.68", lng: null }), {
    label: "Home", line: "Main Road", landmark: "", phone: "9876543210", lat: 14.68, lng: null, isDefault: false,
  });
});
