// routes/admin.js
// Platform-owner-level routes. Everything here requires an "admin"
// role JWT.

import { Router } from "express";
import { getAll, getOne, updateRow, insertRow, deleteRow, getNextId } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import {
  validate,
  approveShopSchema,
  updateUserStatusSchema,
  adminAddShopkeeperSchema,
  adminApproveLegalSchema,
  adminAddAdminMemberSchema,
} from "../schemas.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";
import { sendShopkeeperInviteEmail } from "../mailer.js";
import { sendAdminWelcomeAlert } from "../sms.js";
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
    totalAdmins: users.filter((u) => u.role === "admin").length,
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

// GET /api/admin/admins — List all authorized administrative team members
router.get("/admins", asyncHandler(async (req, res) => {
  const allUsers = await getAll("users");
  const admins = allUsers.filter((u) => u.role === "admin");
  // Ensure Master Admin Bhavya Chhajer is sorted to top
  admins.sort((a, b) => {
    if (a.phone === "8283833894") return -1;
    if (b.phone === "8283833894") return 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  res.json({ admins });
}));

// POST /api/admin/admins — Authorize & add a new admin team member to scale up
router.post(
  "/admins",
  validate(adminAddAdminMemberSchema),
  asyncHandler(async (req, res) => {
    const { name, phone, email, designation } = req.body;
    const cleanPhone = phone ? phone.replace(/\D/g, "").slice(-10) : "";
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const now = new Date().toISOString();

    const allUsers = await getAll("users");
    const existingAdmin = allUsers.find(
      (u) =>
        u.role === "admin" &&
        ((cleanPhone && u.phone && u.phone.replace(/\D/g, "").slice(-10) === cleanPhone) ||
          (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail))
    );

    if (existingAdmin) {
      throw new ApiError(
        400,
        `An administrator with this mobile number or email is already registered (${existingAdmin.name}).`
      );
    }

    // Check if user exists with another role (e.g., customer/shopkeeper) and promote
    const existingUser = allUsers.find(
      (u) =>
        (cleanPhone && u.phone && u.phone.replace(/\D/g, "").slice(-10) === cleanPhone) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
    );

    let adminUser;
    if (existingUser) {
      adminUser = await updateRow("users", existingUser.id, {
        role: "admin",
        designation: designation || "Operations Admin",
        status: "active",
        promotedAt: now,
        promotedBy: req.user.phone || req.user.email || req.user.name || "Master Admin",
      });
    } else {
      const userId = await getNextId("U");
      adminUser = {
        id: userId,
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        role: "admin",
        designation: designation || "Operations Admin",
        address: "Administrative Headquarters",
        shopName: null,
        shopId: null,
        status: "active",
        createdBy: req.user.phone || req.user.email || req.user.name || "Master Admin",
        createdAt: now,
      };
      await insertRow("users", adminUser);
    }

    // Dispatch welcome notification to WhatsApp
    if (cleanPhone) {
      sendAdminWelcomeAlert({
        phone: cleanPhone,
        name: name.trim(),
        designation: designation || "Operations Admin",
      }).catch((err) => console.warn("WhatsApp admin alert failed:", err.message));
    }

    res.status(201).json({
      success: true,
      message: `Administrator ${name} successfully authorized!`,
      admin: adminUser,
    });
  })
);

// DELETE /api/admin/admins/:id — Revoke admin privileges
router.delete("/admins/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await getOne("users", { id });

  if (!target) throw new ApiError(404, "Admin member not found.");
  if (target.role !== "admin") throw new ApiError(400, "Target user is not an administrator.");

  // Strict Safeguards: Cannot revoke self or Master Admin
  if (target.id === req.user.id) {
    throw new ApiError(400, "You cannot revoke your own administrator clearance.");
  }
  if (target.phone === "8283833894" || target.email?.toLowerCase() === "chhajerbhavya30@gmail.com") {
    throw new ApiError(403, "Master Administrator clearance cannot be revoked.");
  }

  // Revoke admin clearance and downgrade to customer role
  await updateRow("users", id, {
    role: "customer",
    designation: null,
    revokedAt: new Date().toISOString(),
    revokedBy: req.user.phone || req.user.name || "Master Admin",
  });

  res.json({
    success: true,
    message: `Administrator privileges for ${target.name} have been revoked.`,
  });
}));

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
