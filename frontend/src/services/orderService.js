// services/orderService.js
// Orders are NOT stored in localStorage on the frontend at all.
// Every function here talks to the backend API, which is the single
// source of truth shared by both the customer app and the shopkeeper
// app. This is what guarantees a status change made by the shopkeeper
// is immediately visible to the customer (and vice versa) — they're
// reading the same record, not two separate local copies.

import { api } from "./api";

export async function placeOrder(orderData) {
  const { order } = await api.post("/orders", orderData);
  return order;
}

// getOrders() with no args -> ALL orders (shopkeeper view)
// getOrders({ phone }) -> just that customer's orders
// getOrders({ status }) -> filter by status
export async function getOrders(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const { orders } = await api.get(`/orders${params ? `?${params}` : ""}`);
  return orders;
}

export async function getOrderById(id) {
  const { order } = await api.get(`/orders/${id}`);
  return order;
}

export async function updateOrderStatus(id, status) {
  const { order } = await api.patch(`/orders/${id}/status`, { status });
  return order;
}

// Customer self-cancel — only works while the order is still Pending
// (enforced server-side too; this call will fail cleanly otherwise).
export async function cancelOrder(id) {
  const { order } = await api.patch(`/orders/${id}/cancel`, {});
  return order;
}

export async function deleteOrder(id) {
  return api.del(`/orders/${id}`);
}

export async function getDashboardStats() {
  return api.get("/stats");
}

// CSV export needs the Authorization header, which a plain <a href>
// can't send — so we fetch it as a blob and trigger the download
// ourselves instead of using getOrdersExportUrl() as a direct link.
export async function downloadOrdersCsv() {
  const token = localStorage.getItem("apnakirana_token");
  const res = await fetch("/api/orders/export/csv", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Could not export orders. Please try again.");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apnakirana-orders-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Order status pipeline, shared by Shopkeeper Orders + Order Tracking UI
export const ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Packed",
  "Out for Delivery",
  "Delivered",
];

export const NEXT_ACTIONS = {
  Pending: [{ label: "Accept", status: "Accepted" }, { label: "Reject", status: "Cancelled" }],
  Accepted: [{ label: "Mark Packed", status: "Packed" }, { label: "Cancel", status: "Cancelled" }],
  Packed: [{ label: "Dispatch", status: "Out for Delivery" }],
  "Out for Delivery": [{ label: "Mark Delivered", status: "Delivered" }],
  Delivered: [],
  Cancelled: [],
};

// Safely normalize an order's items for rendering, in case any old/odd
// data shape sneaks in (string items, missing fields, etc.) — this is
// what stops "Objects are not valid as a React child" style crashes.
export function normalizeOrderForDisplay(order) {
  if (!order) return order;
  const items = (order.items || []).map((it) => {
    if (typeof it === "string") return { id: it, name: it, unit: "", qty: 1, price: 0 };
    return {
      id: it.id ?? "unknown",
      name: it.name ?? "Unknown item",
      unit: it.unit ?? "",
      qty: Number(it.qty ?? it.quantity ?? 1),
      price: Number(it.price ?? 0),
    };
  });
  return { ...order, items };
}
