// schemas.js
// Zod schemas for validating request bodies. Wrap route handlers with
// validate(schema) so malformed requests get a clean 400 with a clear
// message instead of crashing deeper in the app.

import { z } from "zod";

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err); // handled by errorHandler's ZodError branch
    }
  };
}

const phoneSchema = z.string().regex(/^\d{10}$/, "Enter a valid 10-digit phone number.");
const emailSchema = z.string().email("Enter a valid email address.");

// Turns "" into undefined before the rest of the chain runs, so an
// optional field that's present-but-empty is treated as omitted.
const emptyToUndefined = (val) => (val === "" ? undefined : val);

export const sendOtpSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.phone || data.email, {
    message: "Either a valid 10-digit phone number or a valid email is required.",
  });

export const verifyOtpSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    otp: z.string().min(4).max(6),
    role: z.enum(["customer", "shopkeeper", "admin"]).default("customer"),
    name: z.preprocess(emptyToUndefined, z.string().min(1).max(80).optional()),
    shopName: z.preprocess(emptyToUndefined, z.string().min(1).max(120).optional()),
    firebaseVerified: z.boolean().optional(),
  })
  .refine((data) => data.phone || data.email, {
    message: "Either phone number or email is required for verification.",
  });

// Admin adding a shopkeeper directly
export const adminAddShopkeeperSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, "Owner name must be at least 2 characters."),
  phone: phoneSchema,
  shopName: z.string().min(2, "Shop name must be at least 2 characters."),
  area: z.string().optional().default(""),
});

// Shopkeeper government-authorized GST & legal documents schema
// GSTIN: 15 alphanumeric (e.g. 07AAAAA0000A1Z5)
// PAN: 10 alphanumeric (e.g. AAAAA0000A)
// FSSAI: 14 digits
export const updateShopLegalSchema = z.object({
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Enter a valid 15-character Government Authorized GSTIN (e.g. 07AAAAA0000A1Z5)"
    ),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Enter a valid 10-character PAN (e.g. ABCDE1234F)")
    .optional()
    .or(z.literal("")),
  fssaiNumber: z
    .string()
    .trim()
    .regex(/^\d{14}$/, "Enter a valid 14-digit FSSAI License/Registration Number")
    .optional()
    .or(z.literal("")),
  tradeLicense: z.string().trim().optional().default(""),
  legalTradeName: z.string().trim().optional().default(""),
  bankDetails: z
    .object({
      bankName: z.string().optional().default(""),
      accountNumber: z.string().optional().default(""),
      ifsc: z.string().trim().toUpperCase().optional().default(""),
      accountHolder: z.string().optional().default(""),
    })
    .optional(),
  documents: z
    .object({
      gstCertificate: z.string().optional(),
      panCard: z.string().optional(),
      fssaiCertificate: z.string().optional(),
      tradeLicenseDoc: z.string().optional(),
      bankProof: z.string().optional(),
    })
    .optional(),
  status: z.enum(["draft", "submitted", "verified", "rejected"]).optional().default("submitted"),
});

export const adminApproveLegalSchema = z.object({
  status: z.enum(["verified", "rejected", "needs_revision", "pending"]),
  notes: z.string().max(500).optional().default(""),
});

export const orderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string().optional().default(""),
  qty: z.number().positive(),
  price: z.number().nonnegative(),
  image: z.string().optional().default(""),
  expiryDate: z.string().optional().nullable(),
});

export const placeOrderSchema = z.object({
  customer: z.string().min(1, "Customer name is required."),
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit phone number."),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5, "Please enter a full delivery address."),
  shopId: z.string().nullable().optional(),
  shopName: z.string().optional(),
  deliveryTime: z.string().optional(),
  notes: z.string().max(300).optional().default(""),
  paymentMethod: z.string().optional().default("Cash on Delivery"),
  items: z.array(orderItemSchema).min(1, "Cannot place an order with an empty cart."),
  destLat: z.number().optional().nullable(),
  destLng: z.number().optional().nullable(),
  discount: z.number().optional().default(0),
  couponCode: z.string().optional().nullable(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["Pending", "Accepted", "Packed", "Out for Delivery", "Delivered", "Cancelled"]),
});

export const createProductSchema = z.object({
  shopId: z.string(),
  name: z.string().min(1),
  unit: z.string().optional().default(""),
  price: z.number().positive(),
  category: z.string().optional().default("General"),
  image: z.string().optional().default(""),
  expiryDate: z.string().optional().nullable(),
  inStock: z.boolean().optional().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const approveShopSchema = z.object({
  status: z.enum(["approved", "pending", "suspended"]),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["active", "pending", "suspended"]),
});

export const createReviewSchema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(""),
});
