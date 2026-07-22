const PLACEHOLDER = "https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/icon.png";

export function matchesSearch(item, sectionTitle, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${item.title} ${item.description ?? ""} ${sectionTitle}`.toLowerCase().includes(normalizedQuery);
}

export function getMenuSearchSuggestions(sections, query, vegOnly = false) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const seen = new Set();
  const suggestions = [];

  (Array.isArray(sections) ? sections : []).forEach((section) => {
    (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
      if (vegOnly && !item.isVeg) return;
      if (!matchesSearch(item, section.heading, normalizedQuery)) return;
      if (seen.has(item.id)) return;

      seen.add(item.id);
      suggestions.push({
        id: item.id,
        title: item.title,
        section: section.heading,
        image: item.imageUrl || PLACEHOLDER,
      });
    });
  });

  return suggestions.slice(0, 6);
}
