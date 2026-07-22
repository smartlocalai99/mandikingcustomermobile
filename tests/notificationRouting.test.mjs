import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationDeduper, notificationRoute } from "../src/lib/notificationRouting.mjs";

test("deduplicates a notification response identifier", () => {
  const alreadyHandled = createNotificationDeduper();
  assert.equal(alreadyHandled("push-1"), false);
  assert.equal(alreadyHandled("push-1"), true);
  assert.equal(alreadyHandled("push-2"), false);
  assert.equal(alreadyHandled(null), false);
});

test("routes linked pushes to the offer", () => {
  assert.deepEqual(
    notificationRoute({ title: "Sale", body: "Today", data: { offerId: "offer-1" } }),
    { kind: "offer", offerId: "offer-1" }
  );
});

test("routes normal pushes to transient notifications", () => {
  assert.deepEqual(notificationRoute({ title: "Hello", body: "News", data: {} }), {
    kind: "inbox",
    notification: { title: "Hello", body: "News", offerId: null },
  });
});
