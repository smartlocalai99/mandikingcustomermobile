const INSTALLATION_KEY = "smartrest_push_installation_id";

export function startPushRegistration({ register, addPushTokenListener }) {
  const refreshRegistration = () => {
    Promise.resolve(register()).catch(() => {});
  };

  refreshRegistration();
  const subscription = addPushTokenListener(refreshRegistration);
  return () => subscription.remove();
}

export async function getInstallationId(storage, createId) {
  const existing = await storage.getItem(INSTALLATION_KEY);
  if (existing) return existing;

  const created = createId();
  await storage.setItem(INSTALLATION_KEY, created);
  return created;
}

export async function submitPushRegistration(client, registration) {
  const { error } = await client.functions.invoke("register-push-token", {
    body: registration,
  });
  if (error) throw error;
}

export async function registerForPushNotifications({
  notifications,
  projectId,
  platform,
  installationId,
  submit,
  androidImportance,
}) {
  if (!projectId) throw new Error("EAS project ID is not configured");

  if (platform === "android") {
    await notifications.setNotificationChannelAsync("default", {
      name: "SmartRest notifications",
      importance: androidImportance,
    });
  }

  const existing = await notifications.getPermissionsAsync();
  const permission =
    existing.status === "granted"
      ? existing
      : await notifications.requestPermissionsAsync();
  if (!["granted", "provisional"].includes(permission.status)) return null;

  const { data: expoPushToken } = await notifications.getExpoPushTokenAsync({ projectId });
  const registration = { installationId, expoPushToken, platform };
  await submit(registration);
  return expoPushToken;
}
