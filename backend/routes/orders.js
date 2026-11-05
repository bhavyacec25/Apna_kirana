// routes/orders.js
// Still THE single source of truth for orders — now backed by
// Firebase Firestore, fully async, protected by JWT auth so a customer
// token can't read/modify someone else's orders, and only
// shopkeepers/admins can change status. Also drives the simulated live
// delivery location (see deliverySimulation.js) once an order goes
// "Out for Delivery".
//
// NOTE on Firestore vs SQL: Firestore has no SQL WHERE/ORDER BY string
// building, so multi-condition filtering and sorting below are done in
// plain JavaScript after a single getAll() fetch. That's fine at this
// project's scale (a shop's or a customer's order history); a
// higher-volume production app would instead push these filters into
// real Firestore .where()/.orderBy() query chains (see getFirestore()
// in db.js for direct access when that's needed).

import { Router } from "express";
import { getOne, insertRow, updateRow, deleteRow, getNextId, getAll } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate, placeOrderSchema, updateStatusSchema } from "../schemas.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";
import { emitOrderCreated, emitOrderStatusChanged } from "../realtime.js";
import { startDeliverySimulation, stopDeliverySimulation } from "../deliverySimulation.js";

const router = Router();

const NEXT_STATUS = {
  Pending: ["Accepted", "Cancelled"],
  Accepted: ["Packed", "Cancelled"],
  Packed: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

const byNewestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

// GET /api/orders            -> all orders (shopkeeper/admin view or customer view)
// GET /api/orders?phone=...  -> a specific customer's orders
// GET /api/orders?status=... -> filter by status
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const { phone, status } = req.query;

  let orders = await getAll("orders");

  if (req.user.role === "customer") {
    orders = orders.filter((o) =>
      o.customerId === req.user.id ||
      (req.user.phone && o.phone === req.user.phone) ||
      (req.user.email && o.email === req.user.email) ||
      (phone && o.phone === phone)
    );
  } else if (req.user.role === "shopkeeper") {
    if (req.user.shopId) {
      orders = orders.filter((o) => o.shopId === req.user.shopId);
    }
  }

  if (phone && req.user.role !== "customer") {
    orders = orders.filter((o) => o.phone === phone);
  }
  if (status && status !== "All") {
    orders = orders.filter((o) => o.status === status);
  }

  orders.sort(byNewestFirst);
  res.json({ orders });
}));

// GET /api/orders/export/csv — shopkeeper/admin only, downloadable sales report
router.get("/export/csv", requireRole("shopkeeper", "admin"), asyncHandler(async (req, res) => {
  let orders;
  if (req.user.role === "shopkeeper") {
    const me = await getOne("users", { id: req.user.id });
    orders = me?.shopId ? await getAll("orders", { shopId: me.shopId }) : [];
  } else {
    orders = await getAll("orders");
  }
  orders.sort(byNewestFirst);

  const header = ["Order ID", "Date", "Customer", "Phone", "Items", "Subtotal", "Delivery Fee", "Platform Fee", "Total", "Status"];
  const csvEscape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const csvRows = orders.map((o) => {
    const items = (o.items || []).map((it) => `${it.name} x${it.qty}`).join("; ");
    return [o.id, o.date, o.customer, o.phone, items, o.subtotal, o.deliveryFee, o.platformFee, o.total, o.status]
      .map(csvEscape)
      .join(",");
  });
  const csv = [header.map(csvEscape).join(","), ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="apnakirana-orders-${Date.now()}.csv"`);
  res.send(csv);
}));

// GET /api/orders/:id
router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const order = await getOne("orders", { id: req.params.id });
  if (!order) throw new ApiError(404, "Order not found");
  if (req.user.role === "customer") {
    const isOwner =
      order.customerId === req.user.id ||
      (req.user.phone && order.phone === req.user.phone) ||
      (req.user.email && order.email === req.user.email);
    if (!isOwner) throw new ApiError(403, "You can only view your own orders.");
  }
  res.json({ order });
}));

// GET /api/orders/:id/location — current rider + destination + shop coordinates for the tracking map
router.get("/:id/location", requireAuth, asyncHandler(async (req, res) => {
  const order = await getOne("orders", { id: req.params.id });
  if (!order) throw new ApiError(404, "Order not found");
  if (req.user.role === "customer") {
    const isOwner =
      order.customerId === req.user.id ||
      (req.user.phone && order.phone === req.user.phone) ||
      (req.user.email && order.email === req.user.email);
    if (!isOwner) throw new ApiError(403, "You can only view your own orders.");
  }
  const shop = order.shopId ? await getOne("shops", { id: order.shopId }) : null;
  res.json({
    riderLat: order.riderLat,
    riderLng: order.riderLng,
    destLat: order.destLat || 30.9120,
    destLng: order.destLng || 75.8450,
    shopLat: shop?.latitude || 30.9010,
    shopLng: shop?.longitude || 75.8573,
    status: order.status,
    isRealGps: Boolean(order.isRealGps),
    riderSpeed: order.riderSpeed || null,
    riderHeading: order.riderHeading || null,
  });
}));

// GET /api/orders/:id/rider — Public info for delivery partner mobile console
router.get("/:id/rider", asyncHandler(async (req, res) => {
  const order = await getOne("orders", { id: req.params.id });
  if (!order) throw new ApiError(404, "Order not found");
  const shop = order.shopId ? await getOne("shops", { id: order.shopId }) : null;
  res.json({
    order: {
      id: order.id,
      customer: order.customer,
      phone: order.phone,
      address: order.address,
      status: order.status,
      total: order.total,
      paymentMethod: order.paymentMethod,
      items: order.items || [],
      destLat: order.destLat || 30.9120,
      destLng: order.destLng || 75.8450,
      shopName: shop?.name || order.shopName || "ApnaKirana Partner Store",
      shopAddress: shop?.address || "Store Location",
      shopLat: shop?.latitude || 30.9010,
      shopLng: shop?.longitude || 75.8573,
      isRealGps: Boolean(order.isRealGps),
      riderLat: order.riderLat,
      riderLng: order.riderLng,
    },
  });
}));

// POST /api/orders/:id/rider-location — Real Delivery Partner Phone GPS feed (Blinkit/Zomato style)
router.post("/:id/rider-location", asyncHandler(async (req, res) => {
  const { riderLat, riderLng, speed, heading, accuracy } = req.body;
  if (!riderLat || !riderLng) throw new ApiError(400, "riderLat and riderLng are required");

  const order = await getOne("orders", { id: req.params.id });
  if (!order) throw new ApiError(404, "Order not found");

  // When real phone GPS starts coming in, stop any simulation
  stopDeliverySimulation(order.id);

  const updated = await updateRow("orders", req.params.id, {
    riderLat: Number(riderLat),
    riderLng: Number(riderLng),
    riderSpeed: speed || null,
    riderHeading: heading || null,
    riderAccuracy: accuracy || null,
    riderLastSeen: new Date().toISOString(),
    isRealGps: true,
  });

  emitOrderLocation({
    ...updated,
    id: order.id,
    phone: order.phone,
    shopId: order.shopId,
    riderLat: Number(riderLat),
    riderLng: Number(riderLng),
    speed,
    heading,
    accuracy,
    isRealGps: true,
  });

  res.json({ success: true, riderLat, riderLng, isRealGps: true });
}));

// POST /api/orders/:id/rider-status — Rider updates status (Out for Delivery / Delivered)
router.post("/:id/rider-status", asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await getOne("orders", { id: req.params.id });
  if (!order) throw new ApiError(404, "Order not found");

  const updated = await updateRow("orders", req.params.id, {
    status,
    updatedAt: new Date().toISOString(),
  });

  emitOrderStatusChanged(updated);
  if (status === "Delivered") stopDeliverySimulation(order.id);
  res.json({ success: true, order: updated });
}));

// POST /api/orders  (place order — customer only)
router.post("/", requireRole("customer"), validate(placeOrderSchema), asyncHandler(async (req, res) => {
  const { customer, phone, email, address, shopId, shopName, deliveryTime, notes, paymentMethod, items, destLat, destLng, discount, couponCode } = req.body;

  // If user registered with phone, verify it matches. If user registered with email and had no phone, save this phone to profile.
  if (req.user.phone && phone && phone !== req.user.phone) {
    throw new ApiError(403, "Order phone must match your registered account number.");
  }

  if (!req.user.phone && phone) {
    await updateRow("users", req.user.id, { phone });
    req.user.phone = phone;
  }

  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  // Minimum bill check for online delivery
  if (subtotal < 350) {
    throw new ApiError(400, "Online delivery requires a minimum item bill of ₹350. Please add more items to your cart.");
  }

  // Prevent ordering expired items
  const today = new Date().toISOString().split("T")[0];
  const expired = items.find((it) => it.expiryDate && it.expiryDate < today);
  if (expired) {
    throw new ApiError(400, `Item "${expired.name}" has expired and cannot be ordered.`);
  }

  const deliveryFee = couponCode === "FREEDEL" ? 0 : subtotal > 500 ? 0 : 40;
  const platformFee = 5;
  const appliedDiscount = Number(discount) || 0;
  const total = Math.max(0, subtotal + deliveryFee + platformFee - (couponCode === "FREEDEL" ? 0 : appliedDiscount));
  const now = new Date();

  // Ensure delivery coordinates are always present for real map tracking
  const finalDestLat = destLat || 30.9120;
  const finalDestLng = destLng || 75.8450;

  const order = {
    id: await getNextId("ORD"),
    customerId: req.user.id,
    customer,
    phone: phone || req.user.phone || "",
    email: email || req.user.email || "",
    address,
    shopId: shopId || null,
    shopName: shopName || "ApnaKirana Store",
    deliveryTime: deliveryTime || "As soon as possible",
    notes: notes || "",
    paymentMethod: paymentMethod || "Cash on Delivery",
    items,
    subtotal,
    deliveryFee,
    platformFee,
    discount: appliedDiscount,
    couponCode: couponCode || null,
    total,
    status: "Pending",
    date: now.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    createdAt: now.toISOString(),
    updatedAt: null,
    destLat: finalDestLat,
    destLng: finalDestLng,
    riderLat: null,
    riderLng: null,
    riderName: "Vikas Kumar (Delivery Partner)",
    riderPhone: "+91 8283833894",
    vehicleNumber: "PB-10-EK-4589",
  };

  await insertRow("orders", order);
  emitOrderCreated(order);
  res.status(201).json({ order });
}));

// PATCH /api/orders/:id/cancel   — customer cancels THEIR OWN order,
// only while it's still Pending.
router.patch("/:id/cancel", requireRole("customer"), asyncHandler(async (req, res) => {
  const order = await getOne("orders", { id: req.params.id });
  if (!order) throw new ApiError(404, "Order not found");
  const isOwner =
    order.customerId === req.user.id ||
    (req.user.phone && order.phone === req.user.phone) ||
    (req.user.email && order.email === req.user.email);
  if (!isOwner) throw new ApiError(403, "You can only cancel your own orders.");
  if (order.status !== "Pending") {
    throw new ApiError(400, `This order is already ${order.status.toLowerCase()} and can no longer be cancelled by you. Contact the shop directly.`);
  }
  const updated = await updateRow("orders", req.params.id, { status: "Cancelled", updatedAt: new Date().toISOString() });
  emitOrderStatusChanged(updated);
  res.json({ order: updated });
}));

// PATCH /api/orders/:id/status   { status }   — shopkeeper/admin only
router.patch("/:id/status", requireRole("shopkeeper", "admin"), validate(updateStatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await getOne("orders", { id: req.params.id });
  if (!order) throw new ApiError(404, "Order not found");

  const allowed = NEXT_STATUS[order.status] || [];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Cannot move order from "${order.status}" to "${status}".`);
  }

  const updated = await updateRow("orders", req.params.id, { status, updatedAt: new Date().toISOString() });
  emitOrderStatusChanged(updated);

  if (status === "Out for Delivery") {
    startDeliverySimulation(updated); // fire-and-forget — starts moving a simulated rider toward destLat/destLng
  }
  if (status === "Delivered" || status === "Cancelled") {
    stopDeliverySimulation(updated.id);
  }

  res.json({ order: updated });
}));

// DELETE /api/orders/:id  — admin only (shopkeepers use Cancel instead)
router.delete("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const ok = await deleteRow("orders", req.params.id);
  if (!ok) throw new ApiError(404, "Order not found");
  stopDeliverySimulation(req.params.id);
  res.json({ success: true });
}));

export { NEXT_STATUS };
export default router;
