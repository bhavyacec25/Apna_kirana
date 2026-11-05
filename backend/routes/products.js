// routes/products.js
import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { getAll, getOne, insertRow, updateRow, deleteRow, getNextId } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { validate, createProductSchema, updateProductSchema, updateShopLegalSchema } from "../schemas.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer for images (products, logos)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) {
      return cb(new ApiError(400, "Only PNG, JPG, or WEBP images are allowed."));
    }
    cb(null, true);
  },
});

// Multer for legal documents (GST Certificate, FSSAI, Trade License, PAN)
const docUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `doc-${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new ApiError(400, "Only PDF, PNG, or JPG files are allowed for legal documents."));
    }
    cb(null, true);
  },
});

// POST /api/upload/document — Upload legal proof files (GST certificate, FSSAI, Trade License)
router.post(
  "/upload/document",
  requireRole("shopkeeper", "admin"),
  docUpload.single("document"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No document file uploaded.");
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.originalname });
  })
);

// GET /api/shops  (only approved shops are visible to customers)
router.get("/shops", asyncHandler(async (req, res) => {
  const shops = (await getAll("shops", {})).filter((s) => s.status === "approved");
  res.json({ shops });
}));

// GET /api/shops/:id — Single shop details (includes legal for shopkeeper / admin)
router.get("/shops/:id", asyncHandler(async (req, res) => {
  const shop = await getOne("shops", { id: req.params.id });
  if (!shop) throw new ApiError(404, "Shop not found");
  res.json({ shop });
}));

// PUT /api/shops/:id/legal — Shopkeeper submits Government Authorized GST & Legal documents
router.put(
  "/shops/:id/legal",
  requireRole("shopkeeper", "admin"),
  validate(updateShopLegalSchema),
  asyncHandler(async (req, res) => {
    const shop = await getOne("shops", { id: req.params.id });
    if (!shop) throw new ApiError(404, "Shop not found");

    // Ensure shopkeeper only edits their own shop unless admin
    if (req.user.role === "shopkeeper" && req.user.shopId !== req.params.id) {
      throw new ApiError(403, "You can only update legal paperwork for your own shop.");
    }

    const now = new Date().toISOString();
    const legalData = {
      ...req.body,
      status: req.body.status || "submitted",
      updatedAt: now,
    };

    const updated = await updateRow("shops", req.params.id, {
      legal: legalData,
    });

    res.json({ success: true, shop: updated });
  })
);

// GET /api/products?shopId=S001
router.get("/products", asyncHandler(async (req, res) => {
  const { shopId } = req.query;
  const products = shopId ? await getAll("products", { shopId }) : await getAll("products", {});
  res.json({ products });
}));

// GET /api/products/:id
router.get("/products/:id", asyncHandler(async (req, res) => {
  const product = await getOne("products", { id: req.params.id });
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ product });
}));

// POST /api/products  (shopkeeper adds a product to their own shop)
router.post("/products", requireRole("shopkeeper", "admin"), validate(createProductSchema), asyncHandler(async (req, res) => {
  const id = await getNextId("P");
  const product = { id, ...req.body };
  await insertRow("products", product);
  res.status(201).json({ product });
}));

// PATCH /api/products/:id  (shopkeeper edits price/stock/etc.)
router.patch("/products/:id", requireRole("shopkeeper", "admin"), validate(updateProductSchema), asyncHandler(async (req, res) => {
  const existing = await getOne("products", { id: req.params.id });
  if (!existing) throw new ApiError(404, "Product not found");
  const updated = await updateRow("products", req.params.id, req.body);
  res.json({ product: updated });
}));

// DELETE /api/products/:id
router.delete("/products/:id", requireRole("shopkeeper", "admin"), asyncHandler(async (req, res) => {
  const ok = await deleteRow("products", req.params.id);
  if (!ok) throw new ApiError(404, "Product not found");
  res.json({ success: true });
}));

// POST /api/products/:id/image  (multipart form upload, field name "image")
router.post("/products/:id/image", requireRole("shopkeeper", "admin"), upload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No image file uploaded.");
  const existing = await getOne("products", { id: req.params.id });
  if (!existing) throw new ApiError(404, "Product not found");
  const imageUrl = `/uploads/${req.file.filename}`;
  const updated = await updateRow("products", req.params.id, { image: imageUrl });
  res.json({ product: updated });
}));

export default router;
