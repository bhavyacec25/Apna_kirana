// routes/stats.js
// Dashboard numbers, computed live from real orders — never hardcoded.
// A shopkeeper sees stats for their own shop only; an admin can see
// platform-wide stats via /api/admin/stats instead (see routes/admin.js).
// Firestore has no SUM/AVG/COUNT, so all the aggregation below is plain
// JavaScript over a getAll() result — fine at this project's order volume.

import { Router } from "express";
import { getOne, getAll } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", requireRole("shopkeeper", "admin"), asyncHandler(async (req, res) => {
  const today = new Date().toLocaleDateString("en-IN");

  const shopId = req.user.role === "shopkeeper" ? (await getOne("users", { id: req.user.id }))?.shopId : null;
  const orders = shopId ? await getAll("orders", { shopId }) : await getAll("orders");

  const todaysOrders = orders.filter((o) => o.date === today);
  const revenue = orders.filter((o) => o.status === "Delivered").reduce((sum, o) => sum + o.total, 0);
  const uniqueCustomers = new Set(orders.map((o) => o.phone)).size;
  const latestOrder = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  res.json({
    todaysOrderCount: todaysOrders.length,
    revenue,
    totalOrders: orders.length,
    uniqueCustomers,
    latestOrder,
    statusCounts,
  });
}));

export default router;
