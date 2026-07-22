import assert from "node:assert/strict";
import test from "node:test";
import {
  getInstallationId,
  registerForPushNotifications,
  startPushRegistration,
  submitPushRegistration,
} from "../src/lib/pushRegistration.mjs";

test("starts push registration immediately and refreshes it when the native token changes", async () => {
  let registrations = 0;
  let tokenListener;
  let removed = false;

  const cleanup = startPushRegistration({
    register: async () => {
      registrations += 1;
    },
    addPushTokenListener: (listener) => {
      tokenListener = listener;
      return { remove: () => { removed = true; } };
    },
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(registrations, 1);

  tokenListener();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(registrations, 2);

  cleanup();
  assert.equal(removed, true);
});

test("reuses and creates a persisted installation id", async () => {
  const existing = {
    getItem: async () => "existing-id",
    setItem: async () => assert.fail(),
  };
  assert.equal(await getInstallationId(existing, () => "new-id"), "existing-id");

  let saved;
  const empty = {
    getItem: async () => null,
    setItem: async (_key, value) => {
      saved = value;
    },
  };
  assert.equal(await getInstallationId(empty, () => "new-id"), "new-id");
  assert.equal(saved, "new-id");
});

test("does not register when permission is denied", async () => {
  const result = await registerForPushNotifications({
    notifications: {
      getPermissionsAsync: async () => ({ status: "denied" }),
      requestPermissionsAsync: async () => ({ status: "denied" }),
    },
    projectId: "project-id",
    platform: "ios",
    installationId: "install-id",
    submit: async () => assert.fail(),
  });
  assert.equal(result, null);
});

test("requires the EAS project id", async () => {
  await assert.rejects(
    registerForPushNotifications({ notifications: {}, projectId: null, platform: "ios" }),
    /EAS project ID/
  );
});

test("submits the Expo token and propagates function errors", async () => {
  const calls = [];
  const client = {
    functions: {
      invoke: async (...args) => {
        calls.push(args);
        return { error: null };
      },
    },
  };
  await submitPushRegistration(client, {
    installationId: "install-id",
    expoPushToken: "ExpoPushToken[abc]",
    platform: "ios",
  });
  assert.deepEqual(calls, [
    [
      "register-push-token",
      {
        body: {
          installationId: "install-id",
          expoPushToken: "ExpoPushToken[abc]",
          platform: "ios",
        },
      },
    ],
  ]);
});

test("registers a fresh or rotated token through the same submit callback", async () => {
  const submitted = [];
  const notifications = {
    getPermissionsAsync: async () => ({ status: "granted" }),
    getExpoPushTokenAsync: async ({ projectId }) => ({
      data: `ExpoPushToken[${projectId}]`,
    }),
  };
  const result = await registerForPushNotifications({
    notifications,
    projectId: "project-id",
    platform: "ios",
    installationId: "install-id",
    submit: async (value) => submitted.push(value),
  });
  assert.equal(result, "ExpoPushToken[project-id]");
  assert.deepEqual(submitted[0], {
    installationId: "install-id",
    expoPushToken: "ExpoPushToken[project-id]",
    platform: "ios",
  });
});
