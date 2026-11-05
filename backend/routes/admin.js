// routes/admin.js
// Platform-owner-level routes. Everything here requires an "admin"
// role JWT.

import { Router } from "express";
import { getAll, getOne, updateRow, insertRow, getNextId } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import {
  validate,
  approveShopSchema,
  updateUserStatusSchema,
  adminAddShopkeeperSchema,
  adminApproveLegalSchema,
} from "../schemas.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";
import { sendShopkeeperInviteEmail } from "../mailer.js";
import { setPendingOtp } from "./auth.js";

const router = Router();
router.use(requireRole("admin"));

// GET /api/admin/stats — platform-wide numbers
router.get("/stats", asyncHandler(async (req, res) => {
  const orders = await getAll("orders");
  const shops = await getAll("shops");
  const users = await getAll("users");

  const revenue = orders.filter((o) => o.status === "Delivered").reduce((sum, o) => sum + o.total, 0);
  const pendingShops = shops.filter((s) => s.status === "pending" || s.legal?.status === "submitted").length;
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalOrders: orders.length,
    totalRevenue: revenue,
    totalShops: shops.length,
    pendingShops,
    totalCustomers: users.filter((u) => u.role === "customer").length,
    totalShopkeepers: users.filter((u) => u.role === "shopkeeper").length,
    statusCounts,
  });
}));

// GET /api/admin/orders — all orders
router.get("/orders", asyncHandler(async (req, res) => {
  const orders = (await getAll("orders")).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ orders });
}));

// GET /api/admin/shops — all shops with legal details
router.get("/shops", asyncHandler(async (req, res) => {
  res.json({ shops: await getAll("shops") });
}));

// POST /api/admin/shopkeepers — Admin invites/adds a shopkeeper via email & phone
router.post(
  "/shopkeepers",
  validate(adminAddShopkeeperSchema),
  asyncHandler(async (req, res) => {
    const { email, name, phone, shopName, area } = req.body;
    const now = new Date().toISOString();

    // Check if email already registered
    const allUsers = await getAll("users");
    const existingByEmail = allUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existingByEmail) {
      throw new ApiError(400, `A user with email ${email} is already registered (${existingByEmail.role}).`);
    }

    const existingByPhone = allUsers.find((u) => u.phone === phone);
    if (existingByPhone) {
      throw new ApiError(400, `A user with phone ${phone} is already registered.`);
    }

    // 1. Create shop record
    const shopId = await getNextId("S");
    const shop = {
      id: shopId,
      name: shopName,
      area: area || "",
      rating: 0,
      deliveryTime: "20-30 min",
      image: "kirana",
      ownerId: null,
      status: "pending", // becomes approved once legal/GST verified
      legal: {
        status: "draft",
        gstin: "",
        fssaiNumber: "",
        panNumber: "",
        tradeLicense: "",
        bankDetails: {},
        documents: {},
        updatedAt: now,
      },
      createdAt: now,
    };
    await insertRow("shops", shop);

    // 2. Create user record
    const userId = `U${Date.now()}`;
    const user = {
      id: userId,
      name,
      phone,
      email,
      role: "shopkeeper",
      address: area || "",
      shopName,
      shopId,
      status: "active",
      createdAt: now,
    };
    await insertRow("users", user);
    await updateRow("shops", shopId, { ownerId: userId });

    // 3. Generate 6-digit access OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setPendingOtp(email, generatedOtp, { role: "shopkeeper", name, shopName });
    setPendingOtp(phone, generatedOtp, { role: "shopkeeper", name, shopName });

    // 4. Send invitation email via Gmail
    const mailResult = await sendShopkeeperInviteEmail({
      to: email,
      shopkeeperName: name,
      shopName,
      otp: generatedOtp,
      loginUrl: "http://localhost:5173/login",
    });

    res.status(201).json({
      success: true,
      message: `Shopkeeper ${name} successfully added!`,
      otp: generatedOtp, // returned to Admin so admin can view/copy it immediately
      emailDelivery: mailResult,
      shopkeeper: user,
      shop,
    });
  })
);

// PATCH /api/admin/shops/:id/status — Update general shop status
router.patch("/shops/:id/status", validate(approveShopSchema), asyncHandler(async (req, res) => {
  const shop = await getOne("shops", { id: req.params.id });
  if (!shop) throw new ApiError(404, "Shop not found");
  const updated = await updateRow("shops", req.params.id, { status: req.body.status });
  res.json({ shop: updated });
}));

// PATCH /api/admin/shops/:id/legal — Admin approves or rejects government GST & legal papers
router.patch(
  "/shops/:id/legal",
  validate(adminApproveLegalSchema),
  asyncHandler(async (req, res) => {
    const shop = await getOne("shops", { id: req.params.id });
    if (!shop) throw new ApiError(404, "Shop not found");

    const { status, notes } = req.body;
    const now = new Date().toISOString();

    const currentLegal = shop.legal || {};
    const updatedLegal = {
      ...currentLegal,
      status,
      notes: notes || "",
      reviewedAt: now,
    };

    // If legal status is verified, automatically approve the shop
    const shopPatch = {
      legal: updatedLegal,
    };
    if (status === "verified") {
      shopPatch.status = "approved";
    }

    const updated = await updateRow("shops", req.params.id, shopPatch);
    res.json({ success: true, shop: updated });
  })
);

// GET /api/admin/users — all users
router.get("/users", asyncHandler(async (req, res) => {
  const { role } = req.query;
  const users = role ? await getAll("users", { role }) : await getAll("users");
  res.json({ users });
}));

// PATCH /api/admin/users/:id/status — toggle user status
router.patch("/users/:id/status", validate(updateUserStatusSchema), asyncHandler(async (req, res) => {
  const user = await getOne("users", { id: req.params.id });
  if (!user) throw new ApiError(404, "User not found");
  if (user.role === "admin") throw new ApiError(400, "Cannot change status of an admin account.");
  const updated = await updateRow("users", req.params.id, { status: req.body.status });
  res.json({ user: updated });
}));

export default router;
