// services/paymentService.js
import { api } from "./api";

export async function getPaymentConfig() {
  return api.get("/payment/config");
}

export async function createPaymentOrder(amount) {
  return api.post("/payment/create-order", { amount });
}

export async function verifyPayment(payload) {
  return api.post("/payment/verify", payload);
}

// Loads the Razorpay checkout script once, only when real payment mode is enabled.
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
