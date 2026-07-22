import assert from "node:assert/strict";
import test from "node:test";
import { requestForegroundLocation } from "../src/lib/locationPermissions.mjs";

test("returns a confirmed reverse-geocoded address", async () => {
  const result = await requestForegroundLocation({
    permissions: { getForegroundPermissionsAsync: async () => ({ status: "granted" }) },
    getCurrentPositionAsync: async () => ({ coords: { latitude: 14.6819, longitude: 78.8521 } }),
    reverseGeocode: async (lat, lon) => ({ line: `Kadapa ${lat},${lon}`, landmark: "Kadapa" }),
  });

  assert.equal(result.landmark, "Kadapa");
  assert.equal(result.latitude, 14.6819);
  assert.equal(result.longitude, 78.8521);
});

test("returns a settings-recovery error when location is denied", async () => {
  await assert.rejects(
    requestForegroundLocation({
      permissions: {
        getForegroundPermissionsAsync: async () => ({ status: "denied", canAskAgain: false }),
      },
    }),
    (error) => error.code === "LOCATION_DENIED" && error.canOpenSettings === true,
  );
});
