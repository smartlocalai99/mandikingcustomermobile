import { customerDesign } from "../constants/customerDesign.mjs";

const FALLBACKS = {
  Mandi: { sectionTitle: "Chicken Mandi", imageUrl: "./assets/mandi-category.png" },
  Starters: { sectionTitle: "Chicken Starters", imageUrl: "./assets/starters-category.png" },
  Rotis: { sectionTitle: "Rotis", imageUrl: "./assets/rotis-category.png" },
  Desserts: { sectionTitle: "Desserts", imageUrl: "./assets/desserts-category.png" },
};

export function normalizeMenuSections(sections) {
  return (Array.isArray(sections) ? sections : [])
    .filter((section) => Array.isArray(section?.items))
    .map((section) => ({ ...section, items: section.items.filter(Boolean) }));
}

function matchesSearch(item, sectionTitle, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${item.title} ${item.description ?? ""} ${sectionTitle}`.toLowerCase().includes(normalizedQuery);
}

export function getVisibleMenuSections(sections, { vegOnly = false, searchQuery = "" } = {}) {
  return normalizeMenuSections(sections)
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => !vegOnly || item.isVeg)
        .filter((item) => matchesSearch(item, section.heading, searchQuery)),
    }))
    .filter((section) => section.items.length > 0);
}

// The owner app's menu_categories table was seeded with paths meant for the
// web app's public/ directory (e.g. "/mandi9.png"), which React Native's
// Image component cannot resolve. Only trust a remote image if it's an
// absolute http(s) URL (e.g. Supabase storage); anything else — including
// those web-relative paths — falls back to the bundled native asset.
function isUsableRemoteUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

export function getPrimaryCategories(categories = []) {
  return customerDesign.categoryLabels.map((label) => {
    const remote = categories.find((category) => category.label?.trim().toLowerCase() === label.toLowerCase());
    const fallback = FALLBACKS[label];
    return {
      id: remote?.id ?? `fallback-${label.toLowerCase()}`,
      label,
      imageUrl: isUsableRemoteUrl(remote?.imageUrl) ? remote.imageUrl : fallback.imageUrl,
      sectionId: remote?.sectionId ?? null,
      sectionTitle: remote?.sectionTitle || fallback.sectionTitle,
    };
  });
}
