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
