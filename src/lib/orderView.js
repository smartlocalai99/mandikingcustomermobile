const titleCaseStatus = (value) =>
  String(value || "preparing")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const CURRENT_ORDER_STATUSES = new Set(["preparing", "out_for_delivery"]);
const TIMELINE_STEPS = [
  { label: "Ordered", timestampKey: "orderedAt" },
  { label: "Picked up", timestampKey: "pickedUpAt" },
  { label: "Delivered", timestampKey: "deliveredAt" },
];
const STATUS_STEP = {
  preparing: 0,
  out_for_delivery: 1,
  delivered: 2,
  cancelled: 0,
};

export function formatRupees(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(finiteNumber(value));
}

export function formatOrderDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function splitOrders(orders) {
  const sorted = Array.isArray(orders)
    ? [...orders].sort((left, right) => new Date(right?.placedAt || 0) - new Date(left?.placedAt || 0))
    : [];
  const activeOrder = sorted.find((order) => CURRENT_ORDER_STATUSES.has(String(order?.status || "").toLowerCase())) ?? null;

  return {
    activeOrder,
    previousOrders: activeOrder
      ? sorted.filter((order) => !CURRENT_ORDER_STATUSES.has(String(order?.status || "").toLowerCase()))
      : sorted,
  };
}

export function createOrderTimeline(order = {}) {
  const status = String(order.status || "preparing").toLowerCase();
  const completedThrough = STATUS_STEP[status] ?? 0;

  return TIMELINE_STEPS.map((step, index) => {
    const isComplete = index <= completedThrough;
    const timestamp = step.timestampKey === "orderedAt" ? order.orderedAt ?? order.placedAt : order[step.timestampKey];

    return {
      label: step.label,
      isComplete,
      isCurrent: status !== "cancelled" && index === completedThrough,
      timeLabel: isComplete ? (timestamp ? formatOrderDate(timestamp) : "Completed") : "Pending",
    };
  });
}

export function createOrderView(order = {}, accountPhone = "") {
  const itemRows = (Array.isArray(order.items) ? order.items : []).map((entry, index) => {
    const quantity = Math.max(0, finiteNumber(entry?.quantity));
    const unitPrice = finiteNumber(entry?.item?.price);

    return {
      key: entry?.item?.id ?? `${order.id || "order"}-${index}`,
      item: entry?.item ?? {},
      sectionTitle: entry?.sectionTitle ?? "",
      quantity,
      title: entry?.item?.title || "Item unavailable",
      unitPrice,
      lineTotal: quantity * unitPrice,
    };
  });
  const deliveryAddress = order.deliveryAddress || {};

  return {
    id: order.id || "Order",
    statusLabel: titleCaseStatus(order.status),
    placedAtLabel: formatOrderDate(order.placedAt),
    address: String(deliveryAddress.line || "").trim() || "Delivery address unavailable",
    contact: String(deliveryAddress.phone || "").trim() || String(accountPhone || "").trim() || "Contact unavailable",
    deliveryAddress,
    totalItems: finiteNumber(order.totalItems),
    total: finiteNumber(order.total),
    itemRows,
    timelineSteps: createOrderTimeline(order),
  };
}
