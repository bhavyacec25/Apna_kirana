// routes/wishlist.js
// Firestore has no JOIN, so listing a customer's wishlist with full
// product details is done as two fetches combined in JS: get the
// wishlist entries for this phone, then fetch each referenced product.

import { Router } from "express";
import { getAll, getOne, insertRow, getNextId, deleteRow } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

const router = Router();
router.use(requireRole("customer"));

// GET /api/wishlist — the logged-in customer's wishlist, joined with product details
router.get("/", asyncHandler(async (req, res) => {
  const entries = (await getAll("wishlist", { phone: req.user.phone })).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const items = (
    await Promise.all(
      entries.map(async (entry) => {
        const product = await getOne("products", { id: entry.productId });
        return product ? { ...product, wishlistId: entry.id } : null;
      })
    )
  ).filter(Boolean); // drop entries whose product was since deleted

  res.json({ items });
}));

// POST /api/wishlist  { productId }
router.post("/", asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new ApiError(400, "productId is required.");

  const existing = await getOne("wishlist", { phone: req.user.phone, productId });
  if (existing) return res.status(200).json({ alreadyExists: true });

  const id = await getNextId("W");
  await insertRow("wishlist", { id, phone: req.user.phone, productId, createdAt: new Date().toISOString() });
  res.status(201).json({ success: true });
}));

// DELETE /api/wishlist/:productId
router.delete("/:productId", asyncHandler(async (req, res) => {
  const existing = await getOne("wishlist", { phone: req.user.phone, productId: req.params.productId });
  if (!existing) throw new ApiError(404, "Not in wishlist.");
  await deleteRow("wishlist", existing.id);
  res.json({ success: true });
}));

export default router;
