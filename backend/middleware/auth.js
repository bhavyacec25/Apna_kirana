// middleware/auth.js
// Verifies the Bearer token issued at login and attaches the decoded payload to req.user.

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "apnakirana_dev_secret_change_me_before_deploying";

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      name: user.name,
      shopId: user.shopId,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated. Please log in." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "You don't have permission to do that." });
      }
      next();
    });
  };
}
