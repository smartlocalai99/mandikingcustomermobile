import assert from "node:assert/strict";
import test from "node:test";
import { customerDesign } from "../src/constants/customerDesign.mjs";

test("customer design constants preserve web category order and toggle assets", () => {
  assert.deepEqual(customerDesign.categoryLabels, ["Mandi", "Starters", "Rotis", "Desserts"]);
  assert.equal(customerDesign.toggle.vegAsset, "./assets/veg.webp");
  assert.equal(customerDesign.toggle.nonVegAsset, "./assets/nonveg.webp");
});
