export function createNotificationDeduper() {
  const handled = new Set();
  return (identifier) => {
    if (!identifier) return false;
    if (handled.has(identifier)) return true;
    handled.add(identifier);
    return false;
  };
}

export function notificationRoute(content = {}) {
  const offerId =
    typeof content?.data?.offerId === "string" ? content.data.offerId.trim() : "";
  if (offerId) return { kind: "offer", offerId };

  return {
    kind: "inbox",
    notification: {
      title: typeof content.title === "string" ? content.title : "SmartRest",
      body: typeof content.body === "string" ? content.body : "",
      offerId: null,
    },
  };
}
