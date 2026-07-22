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
  const categories = getPrimaryCategories([
    { id: "rotis-remote", label: "Rotis", imageUrl: "https://cdn.example.com/rotis.png" },
  ]);
  assert.deepEqual(categories.map((category) => category.label), ["Mandi", "Starters", "Rotis", "Desserts"]);
  assert.equal(categories[2].imageUrl, "https://cdn.example.com/rotis.png");
  assert.equal(categories[0].imageUrl, "./assets/mandi-category.png");
});

test("falls back to the bundled asset when the remote image isn't an absolute URL", () => {
  // Matches the real menu_categories seed data: web-relative paths like
  // "/mandi9.png" that only resolve inside the Next.js app's public/ dir.
  const categories = getPrimaryCategories([{ id: "mandi-remote", label: "Mandi", imageUrl: "/mandi9.png" }]);
  assert.equal(categories[0].imageUrl, "./assets/mandi-category.png");
});
