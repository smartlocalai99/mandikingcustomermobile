// expo-local-authentication is a native module — it only exists in a build
// that was actually compiled with it linked in. A dev client installed
// before this dependency was added won't have it, and a *static* import of
// the package throws at bundle-evaluation time, before the app even
// renders, taking the whole app down with it (the same failure mode as
// expo-audio). Loading it lazily, inside these two functions, means a
// stale native binary just skips the biometric step instead of crashing.

const AUTH_TYPE_LABELS = {
  1: "Continue with Touch ID", // FINGERPRINT
  2: "Continue with Face ID", // FACIAL_RECOGNITION
  3: "Continue with Iris ID", // IRIS
};

function loadModule() {
  try {
    return require("expo-local-authentication");
  } catch {
    return null;
  }
}

export async function getBiometricButtonLabel() {
  try {
    const LocalAuthentication = loadModule();
    if (!LocalAuthentication) return "Continue";

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    if (!hasHardware || !isEnrolled) return "Continue";

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const preferred = types.find((type) => AUTH_TYPE_LABELS[type]);
    return preferred ? AUTH_TYPE_LABELS[preferred] : "Continue";
  } catch {
    return "Continue";
  }
}

/**
 * Resolves to { gated, success, error? }. `gated: false` means there was
 * nothing to check against (module missing, no hardware, nothing
 * enrolled) — the caller should proceed as if it passed, since there is no
 * biometric layer available to fail against.
 */
export async function authenticateWithBiometrics(promptMessage) {
  try {
    const LocalAuthentication = loadModule();
    if (!LocalAuthentication) return { gated: false, success: true };

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    if (!hasHardware || !isEnrolled) return { gated: false, success: true };

    const result = await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false });
    return result.success ? { gated: true, success: true } : { gated: true, success: false, error: result.error };
  } catch {
    return { gated: false, success: true };
  }
}
