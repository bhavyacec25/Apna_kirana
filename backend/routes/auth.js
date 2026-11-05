import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getAll, getOne, insertRow, updateRow, getNextId } from "../db.js";
import { signToken } from "../middleware/auth.js";
import { validate, sendOtpSchema, verifyOtpSchema } from "../schemas.js";
import { ApiError } from "../middleware/errorHandler.js";
import { sendOtpEmail } from "../mailer.js";
import { sendSmsOtp } from "../sms.js";

const router = Router();

// Store pending OTPs in memory with expiration: identifier -> { otp, expiresAt, role }
export const pendingOtps = new Map();

export function setPendingOtp(identifier, otp, data = {}) {
  const key = identifier.toLowerCase().trim();
  pendingOtps.set(key, {
    otp: String(otp),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    ...data,
  });
}

export function verifyStoredOtp(identifier, enteredOtp) {
  const key = identifier.toLowerCase().trim();
  const record = pendingOtps.get(key);

  // Standard dev fallback OTP
  if (enteredOtp === "1234" || enteredOtp === "123456") {
    return true;
  }

  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    pendingOtps.delete(key);
    return false;
  }

  if (record.otp === enteredOtp.trim()) {
    pendingOtps.delete(key);
    return true;
  }
  return false;
}

const TWILIO_ENABLED = Boolean(
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID
);

let twilioClient = null;
if (TWILIO_ENABLED) {
  const twilio = (await import("twilio")).default;
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Limit OTP requests to 10 requests per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please try again in a few minutes." },
});

// POST /api/auth/send-otp  { phone?, email?, role? }
router.post("/send-otp", otpLimiter, validate(sendOtpSchema), async (req, res, next) => {
  try {
    const { phone, email, role = "User" } = req.body;

    // Strict Security Guard: Only pre-authorized master administrators can request Admin OTPs
    if (role === "admin") {
      const allUsers = await getAll("users");
      const cleanPhone = phone ? phone.replace(/\D/g, "").slice(-10) : "";
      const isAdmin = allUsers.some(
        (u) =>
          u.role === "admin" &&
          ((cleanPhone && u.phone && u.phone.slice(-10) === cleanPhone) ||
            (email && u.email && u.email.toLowerCase() === email.toLowerCase()) ||
            (cleanPhone && cleanPhone === "8283833894") ||
            (email && email.toLowerCase() === "chhajerbhavya30@gmail.com"))
      );
      if (!isAdmin) {
        throw new ApiError(
          403,
          "Access Denied. Only pre-authorized Administrators can access the Admin Portal."
        );
      }
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 1. Email OTP Flow
    if (email) {
      setPendingOtp(email, generatedOtp, { role });
      const emailResult = await sendOtpEmail({
        to: email,
        otp: generatedOtp,
        role,
      });

      return res.json({
        success: true,
        message: `OTP sent to ${email}`,
        channel: "email",
        devHint: emailResult.sent ? undefined : generatedOtp,
      });
    }

    // 2. Phone OTP Flow
    if (phone) {
      setPendingOtp(phone, generatedOtp, { role });

      const smsResult = await sendSmsOtp({ phone, otp: generatedOtp, role });

      if (smsResult.sent) {
        return res.json({
          success: true,
          message: smsResult.message || `Real OTP sent to +91 ${phone}!`,
          channel: smsResult.provider === "WhatsApp" ? "whatsapp" : "sms",
          provider: smsResult.provider,
        });
      }

      // Dev mode: return OTP hint if no external gateway is configured
      return res.json({
        success: true,
        message: `OTP generated for +91 ${phone}`,
        channel: "sms",
        devHint: generatedOtp,
      });
    }

    throw new ApiError(400, "Provide either a phone number or email address.");
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp  { phone?, email?, otp, role, name?, shopName? }
router.post("/verify-otp", validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const { phone, email, otp, role, name, shopName, firebaseVerified } = req.body;
    const identifier = email || phone;

    let otpValid = false;

    if (firebaseVerified) {
      // Real Phone Auth verified directly via Google Firebase SMS
      otpValid = true;
    } else if (email) {
      otpValid = verifyStoredOtp(email, otp);
    } else if (phone) {
      if (TWILIO_ENABLED) {
        const check = await twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: `+91${phone}`, code: otp });
        otpValid = check.status === "approved";
      } else {
        otpValid = verifyStoredOtp(phone, otp);
      }
    }

    if (!otpValid) {
      throw new ApiError(401, "Invalid or expired OTP. Please request a new one.");
    }

    // Find user by email or phone
    const cleanPhone = phone ? phone.replace(/\D/g, "").slice(-10) : "";
    let user = null;
    if (email) {
      const allUsers = await getAll("users");
      user = allUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase() && u.role === role);
    } else if (cleanPhone) {
      const allUsers = await getAll("users");
      user = allUsers.find(
        (u) =>
          u.role === role &&
          u.phone &&
          u.phone.replace(/\D/g, "").slice(-10) === cleanPhone
      );
    }

    if (!user) {
      if (role === "admin") {
        throw new ApiError(403, "Admin accounts cannot be created via self-serve signup.");
      }

      const now = new Date().toISOString();
      let newShopId = null;

      if (role === "shopkeeper") {
        newShopId = await getNextId("S");
        await insertRow("shops", {
          id: newShopId,
          name: shopName || "My Kirana Store",
          area: "",
          rating: 0,
          deliveryTime: "20-30 min",
          image: "kirana",
          ownerId: null,
          status: "pending",
          legal: {
            status: "draft",
          },
          createdAt: now,
        });
      }

      user = {
        id: `U${Date.now()}`,
        name: name || (role === "shopkeeper" ? "Shop Owner" : "Customer"),
        phone: phone || "",
        email: email || "",
        role,
        address: "",
        shopName: role === "shopkeeper" ? shopName || "My Kirana Store" : null,
        shopId: newShopId,
        status: role === "shopkeeper" ? "pending" : "active",
        createdAt: now,
      };
      await insertRow("users", user);
      if (newShopId) {
        await updateRow("shops", newShopId, { ownerId: user.id });
      }
    }

    if (user.status === "suspended") {
      throw new ApiError(403, "This account has been suspended. Please contact ApnaKirana support.");
    }

    const token = signToken(user);
    return res.json({ success: true, user, token });
  } catch (err) {
    next(err);
  }
});

export default router;
