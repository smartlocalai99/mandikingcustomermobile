export function getDisplayLocation({ defaultAddress, savedLocation, fallback = "Kadapa" } = {}) {
  if (defaultAddress?.line?.trim()) return defaultAddress.line.trim();
  if (savedLocation?.landmark?.trim()) return savedLocation.landmark.trim();
  if (savedLocation?.line?.trim()) return savedLocation.line.split(",")[0].trim() || fallback;
  return fallback;
}
