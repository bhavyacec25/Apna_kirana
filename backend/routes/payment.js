// routes/payment.js
// REAL PAYMENT: if RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set in
// .env, this creates a real Razorpay order and verifies the signature
// on completion.
//
// DEV MODE: if those env vars are blank (the default), payment is
// instantly simulated as successful — no real money moves, and the
// frontend shows a "Simulate Payment" button instead of the real
// Razorpay checkout widget. This keeps the whole order flow testable
// without needing a Razorpay account, while making the real
// integration a two-line .env edit away from working.

import { Router } from "express";
import crypto from "crypto";
import { requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";

const router = Router();

const RAZORPAY_ENABLED = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let razorpayClient = null;
if (RAZORPAY_ENABLED) {
  const Razorpay = (await import("razorpay")).default;
  razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// GET /api/payment/config — tells the frontend whether to show the real
// Razorpay widget or the dev-mode "simulate" button, and the public key if real.
router.get("/config", (req, res) => {
  res.json({
    enabled: RAZORPAY_ENABLED,
    keyId: RAZORPAY_ENABLED ? process.env.RAZORPAY_KEY_ID : null,
  });
});

// POST /api/payment/create-order  { amount }  (amount in rupees)
router.post("/create-order", requireRole("customer"), async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) throw new ApiError(400, "A valid amount is required.");

    if (!RAZORPAY_ENABLED) {
      // Dev mode: fabricate an order id the frontend can "pay" against instantly.
      return res.json({
        devMode: true,
        razorpayOrderId: `dev_order_${Date.now()}`,
        amount,
      });
    }

    const order = await razorpayClient.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    res.json({ devMode: false, razorpayOrderId: order.id, amount });
  } catch (err) {
    next(err);
  }
});

// POST /api/payment/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post("/verify", requireRole("customer"), (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!RAZORPAY_ENABLED) {
    // Dev mode: any dev_order_ id is accepted as "paid".
    if (!String(razorpay_order_id || "").startsWith("dev_order_")) {
      throw new ApiError(400, "Invalid dev-mode order reference.");
    }
    return res.json({ verified: true, devMode: true });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Payment verification failed. Please contact support before retrying.");
  }
  res.json({ verified: true, devMode: false });
});

export default router;
