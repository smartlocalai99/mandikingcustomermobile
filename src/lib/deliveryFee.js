const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function calculateDeliveryFee(profile, subtotal, address) {
  if (profile.freeDeliveryMinAmount != null && subtotal >= profile.freeDeliveryMinAmount) {
    return { fee: 0, distanceKm: null, isFree: true };
  }

  const hasCoords =
    profile.lat != null && profile.lng != null && address?.lat != null && address?.lng != null;

  if (!hasCoords) {
    return { fee: profile.deliveryBaseFee, distanceKm: null, isFree: false };
  }

  const distanceKm = haversineDistanceKm(profile.lat, profile.lng, address.lat, address.lng);
  const extraKm = Math.max(0, distanceKm - profile.deliveryBaseKm);
  const fee = Math.round(profile.deliveryBaseFee + extraKm * profile.deliveryPerKmFee);

  return { fee, distanceKm, isFree: false };
}
