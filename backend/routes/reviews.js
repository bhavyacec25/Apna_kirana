// routes/reviews.js
// A customer can rate an order ONLY after it's Delivered, and only
// once per order (enforced by checking for an existing review with
// that orderId before inserting — Firestore has no UNIQUE constraint,
// so this check-then-insert replaces the SQL UNIQUE index that used to
// guarantee it). The shop's displayed rating is the live average of
// all its reviews, recomputed in JS since Firestore has no AVG().

import { Router } from "express";
import { getOne, insertRow, getNextId, updateRow, getAll } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { validate, createReviewSchema } from "../schemas.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// POST /api/reviews  { orderId, rating, comment }  — customer only
router.post("/", requireRole("customer"), validate(createReviewSchema), asyncHandler(async (req, res) => {
  const { orderId, rating, comment } = req.body;
  const order = await getOne("orders", { id: orderId });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.phone !== req.user.phone) throw new ApiError(403, "You can only review your own orders.");
  if (order.status !== "Delivered") throw new ApiError(400, "You can only review an order after it's delivered.");

  const existing = await getOne("reviews", { orderId });
  if (existing) throw new ApiError(400, "You've already reviewed this order.");

  const review = {
    id: await getNextId("REV"),
    orderId,
    shopId: order.shopId,
    phone: order.phone,
    customerName: order.customer,
    rating,
    comment: comment || "",
    createdAt: new Date().toISOString(),
  };
  await insertRow("reviews", review);

  if (order.shopId) {
    const shopReviews = await getAll("reviews", { shopId: order.shopId });
    const avg = shopReviews.reduce((sum, r) => sum + r.rating, 0) / shopReviews.length;
    await updateRow("shops", order.shopId, { rating: Math.round(avg * 10) / 10 });
  }

  res.status(201).json({ review });
}));

// GET /api/reviews/shop/:shopId — public, for a shop's review list
router.get("/shop/:shopId", asyncHandler(async (req, res) => {
  const reviews = (await getAll("reviews", { shopId: req.params.shopId })).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ reviews });
}));

// GET /api/reviews/mine — customer's own reviews (used to know which orders are already reviewed)
router.get("/mine", requireRole("customer"), asyncHandler(async (req, res) => {
  const reviews = await getAll("reviews", { phone: req.user.phone });
  res.json({ reviews });
}));

export default router;
