// services/authService.js
import { api, setToken, clearToken } from "./api";

const CURRENT_USER_KEY = "apnakirana_current_user";

export async function sendOtp(identifier, role = "customer") {
  const isEmail = String(identifier).includes("@");
  const payload = isEmail
    ? { email: identifier.trim().toLowerCase(), role }
    : { phone: identifier.trim(), role };
  return api.post("/auth/send-otp", payload);
}

export async function verifyOtp({ phone, email, otp, role, name, shopName, firebaseVerified }) {
  const payload = {
    otp,
    role,
    ...(phone ? { phone } : {}),
    ...(email ? { email: email.trim().toLowerCase() } : {}),
    ...(name ? { name } : {}),
    ...(shopName ? { shopName } : {}),
    ...(firebaseVerified ? { firebaseVerified: true } : {}),
  };
  const { user, token } = await api.post("/auth/verify-otp", payload);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  setToken(token);
  return user;
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function updateCurrentUser(patch) {
  const user = getCurrentUser();
  if (!user) return null;
  const updated = { ...user, ...patch };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
  return updated;
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  clearToken();
}
