import assert from "node:assert/strict";
import test from "node:test";
import { getPrimaryCategories, getVisibleMenuSections } from "../src/lib/menuPresentation.mjs";

const sections = [
  { id: "mandi", heading: "Mandi", items: [{ id: "m1", title: "Chicken Mandi", isVeg: false }] },
  { id: "rotis", heading: "Rotis", items: [{ id: "r1", title: "Butter Roti", isVeg: true }] },
];

test("filters only vegetarian items while preserving section metadata", () => {
  assert.deepEqual(getVisibleMenuSections(sections, { vegOnly: true, searchQuery: "" }), [
    { id: "rotis", heading: "Rotis", items: [{ id: "r1", title: "Butter Roti", isVeg: true }] },
  ]);
});

test("search uses the same filter and removes empty sections", () => {
  assert.deepEqual(getVisibleMenuSections(sections, { vegOnly: false, searchQuery: "mandi" }), [sections[0]]);
});

test("ignores malformed sections without an items array", () => {
  assert.deepEqual(
    getVisibleMenuSections([{ id: "broken", heading: "Broken" }, ...sections], { searchQuery: "" }),
    sections,
  );
});

test("always returns the four primary categories in web order with fallbacks", () => {
  const categories = getPrimaryCategories([{ id: "rotis-remote", label: "Rotis", imageUrl: "remote" }]);
  assert.deepEqual(categories.map((category) => category.label), ["Mandi", "Starters", "Rotis", "Desserts"]);
  assert.equal(categories[2].imageUrl, "remote");
  assert.equal(categories[0].imageUrl, "./assets/mandi-category.png");
});
