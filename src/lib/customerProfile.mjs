export function normalizeCustomerProfile(row = {}) {
  return {
    phone: String(row.phone ?? "").replace(/\D/g, "").slice(-10),
    name: typeof row.name === "string" ? row.name.trim() : "",
  };
}

export function needsCustomerName(profile) {
  return !normalizeCustomerProfile(profile).name;
}

export function normalizeAddressInput(value = {}) {
  let phone = String(value.phone || "").replace(/\D/g, "");
  if (phone.length === 12 && phone.startsWith("91")) phone = phone.slice(2);
  return {
    ...(value.id ? { id: value.id } : {}),
    label: String(value.label || "Home").trim() || "Home",
    line: String(value.line || "").trim(),
    landmark: String(value.landmark || "").trim(),
    phone: phone.slice(0, 10),
    lat: value.lat == null || value.lat === "" ? null : Number.isFinite(Number(value.lat)) ? Number(value.lat) : null,
    lng: value.lng == null || value.lng === "" ? null : Number.isFinite(Number(value.lng)) ? Number(value.lng) : null,
    isDefault: Boolean(value.isDefault),
  };
}
