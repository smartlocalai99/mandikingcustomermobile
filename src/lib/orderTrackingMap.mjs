function toCoordinate(lat, lng) {
  if (lat == null || lng == null) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/**
 * Resolves nullable-safe map endpoints for a delivery. Coordinates are
 * optional at every layer (restaurant profile, saved address) — this never
 * throws, it just reports which endpoints are usable via `hasRoute`.
 */
export function getOrderMapEndpoints({ restaurant, deliveryAddress } = {}) {
  const restaurantCoordinate = toCoordinate(restaurant?.lat, restaurant?.lng);
  const customerCoordinate = toCoordinate(deliveryAddress?.lat, deliveryAddress?.lng);

  return {
    restaurant: {
      label: restaurant?.name?.trim() || "Restaurant",
      coordinate: restaurantCoordinate,
    },
    customer: {
      label: deliveryAddress?.line?.trim() || "Delivery address",
      coordinate: customerCoordinate,
    },
    hasRoute: Boolean(restaurantCoordinate && customerCoordinate),
  };
}

/** Returns a platform-appropriate turn-by-turn maps URL, or null without both coordinates. */
export function buildMapsUrl(endpoints, platform = "ios") {
  if (!endpoints?.hasRoute) return null;

  const { restaurant, customer } = endpoints;
  const origin = `${restaurant.coordinate.latitude},${restaurant.coordinate.longitude}`;
  const destination = `${customer.coordinate.latitude},${customer.coordinate.longitude}`;

  if (platform === "ios") {
    return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}
