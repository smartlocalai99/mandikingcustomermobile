function locationError(code, message, canOpenSettings = false, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  error.canOpenSettings = canOpenSettings;
  return error;
}

export async function reverseGeocodeCoordinates(latitude, longitude, fetchImpl = fetch) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw locationError("REVERSE_GEOCODE_FAILED", "Could not resolve that location to an address.");
  }

  const data = await response.json();
  if (!data?.display_name) {
    throw locationError("REVERSE_GEOCODE_FAILED", "Could not resolve that location to an address.");
  }

  const address = data.address ?? {};
  const road = /^[A-Z]{2,4}\d+$/.test(address.road ?? "") ? "" : address.road;
  const landmark = address.suburb || address.neighbourhood || address.village || address.town || road || "";
  return { line: data.display_name, landmark };
}

export async function requestForegroundLocation({
  permissions,
  getCurrentPositionAsync,
  reverseGeocode,
  accuracy = "balanced",
}) {
  if (!permissions?.getForegroundPermissionsAsync) {
    throw locationError("LOCATION_UNAVAILABLE", "Location is not available on this device.");
  }

  let permission = await permissions.getForegroundPermissionsAsync();
  if (permission.status === "undetermined" && permissions.requestForegroundPermissionsAsync) {
    permission = await permissions.requestForegroundPermissionsAsync();
  }

  if (permission.status !== "granted") {
    throw locationError(
      "LOCATION_DENIED",
      permission.canAskAgain === false
        ? "Location access is off. Enable it in Settings or enter your address manually."
        : "Location access was denied. Enter your address manually.",
      permission.canAskAgain === false,
    );
  }

  if (!getCurrentPositionAsync || !reverseGeocode) {
    throw locationError("LOCATION_UNAVAILABLE", "Location is not available on this device.");
  }

  let position;
  try {
    position = await getCurrentPositionAsync({ accuracy });
  } catch (cause) {
    throw locationError("LOCATION_UNAVAILABLE", "Could not get your location. Enter it manually.", false, cause);
  }

  const latitude = position?.coords?.latitude;
  const longitude = position?.coords?.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw locationError("LOCATION_UNAVAILABLE", "Could not get your location. Enter it manually.");
  }

  try {
    const address = await reverseGeocode(latitude, longitude);
    return { ...address, latitude, longitude };
  } catch (cause) {
    if (cause?.code === "REVERSE_GEOCODE_FAILED") throw cause;
    throw locationError("REVERSE_GEOCODE_FAILED", "Could not resolve that location to an address.", false, cause);
  }
}
