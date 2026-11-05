// services/cartService.js
// Cart is intentionally kept client-side (it's ephemeral, per-device,
// pre-order data) using ONE localStorage key: apnakirana_cart.
// Every item is normalized to the same shape everywhere:
// { id, name, unit, price, quantity, image, shopId, shopName }
// Internally we always use `quantity` (never `qty` — that spelling is
// only used on the backend's persisted order records).

const CART_KEY = "apnakirana_cart";

function normalizeItem(product, quantity = 1) {
  return {
    id: product.id,
    name: product.name,
    unit: product.unit || "",
    price: Number(product.price) || 0,
    quantity: Number(quantity) || 1,
    image: product.image || "",
    shopId: product.shopId || null,
    shopName: product.shopName || "",
  };
}

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const cart = raw ? JSON.parse(raw) : [];
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  // let other components in the same tab know the cart changed
  window.dispatchEvent(new Event("cart-updated"));
  return cart;
}

export function addToCart(product, quantity = 1) {
  const cart = getCart();

  // Cart is single-shop at a time in this prototype: adding from a
  // different shop replaces the cart (clear + add), which matches how
  // most local-delivery apps behave and avoids mixed-shop checkouts.
  if (cart.length > 0 && product.shopId && cart[0].shopId && cart[0].shopId !== product.shopId) {
    const fresh = [normalizeItem(product, quantity)];
    return saveCart(fresh);
  }

  const existingIdx = cart.findIndex((item) => item.id === product.id);
  if (existingIdx > -1) {
    cart[existingIdx] = {
      ...cart[existingIdx],
      quantity: cart[existingIdx].quantity + quantity,
    };
  } else {
    cart.push(normalizeItem(product, quantity));
  }
  return saveCart(cart);
}

// Used by Reorder — adds several items at once, merging with existing quantities.
export function addItemsToCart(items) {
  const cart = getCart();
  items.forEach((raw) => {
    // Handle old/odd formats safely (string items, `qty` instead of `quantity`, etc.)
    const item = typeof raw === "string" ? { id: raw, name: raw } : raw;
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    const existingIdx = cart.findIndex((c) => c.id === item.id);
    if (existingIdx > -1) {
      cart[existingIdx] = { ...cart[existingIdx], quantity: cart[existingIdx].quantity + quantity };
    } else {
      cart.push(normalizeItem(item, quantity));
    }
  });
  return saveCart(cart);
}

export function updateCartQuantity(id, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter((item) => item.id !== id);
  } else {
    cart = cart.map((item) => (item.id === id ? { ...item, quantity } : item));
  }
  return saveCart(cart);
}

export function removeFromCart(id) {
  const cart = getCart().filter((item) => item.id !== id);
  return saveCart(cart);
}

export const AVAILABLE_COUPONS = [
  {
    code: "APNA50",
    name: "Flat ₹50 OFF",
    desc: "Flat ₹50 off on grocery orders of ₹400+",
    minOrder: 400,
    type: "flat",
    discount: 50,
  },
  {
    code: "FREEDEL",
    name: "Free Delivery",
    desc: "Zero delivery fee on any order (Save ₹40)",
    minOrder: 350,
    type: "free_delivery",
  },
  {
    code: "WELCOME10",
    name: "10% Welcome Discount",
    desc: "10% off up to ₹75 on orders of ₹350+",
    minOrder: 350,
    type: "percent",
    percent: 10,
    maxDiscount: 75,
  },
];

const COUPON_KEY = "apnakirana_coupon";

export function getAppliedCoupon() {
  try {
    const raw = localStorage.getItem(COUPON_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAppliedCoupon(coupon) {
  if (!coupon) {
    localStorage.removeItem(COUPON_KEY);
  } else {
    localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
  }
  window.dispatchEvent(new Event("cart-updated"));
  return coupon;
}

export function removeAppliedCoupon() {
  localStorage.removeItem(COUPON_KEY);
  window.dispatchEvent(new Event("cart-updated"));
}

export function validateCoupon(code, subtotal) {
  const clean = (code || "").trim().toUpperCase();
  const found = AVAILABLE_COUPONS.find((c) => c.code === clean);
  if (!found) {
    throw new Error(`Coupon "${code}" is invalid. Try APNA50, FREEDEL, or WELCOME10.`);
  }
  if (subtotal < found.minOrder) {
    throw new Error(`Coupon ${found.code} requires a minimum order of ₹${found.minOrder}.`);
  }
  return found;
}

export function clearCart() {
  removeAppliedCoupon();
  return saveCart([]);
}

export function getCartTotals(cart = getCart(), coupon = getAppliedCoupon()) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let deliveryFee = cart.length === 0 ? 0 : subtotal > 500 ? 0 : 40;
  const platformFee = cart.length === 0 ? 0 : 5;
  let discount = 0;

  if (coupon && subtotal > 0) {
    if (subtotal >= coupon.minOrder) {
      if (coupon.type === "free_delivery") {
        discount = deliveryFee;
        deliveryFee = 0;
      } else if (coupon.type === "flat") {
        discount = Math.min(coupon.discount, subtotal);
      } else if (coupon.type === "percent") {
        const calc = Math.round((subtotal * coupon.percent) / 100);
        discount = Math.min(calc, coupon.maxDiscount || calc);
      }
    }
  }

  const total = Math.max(0, subtotal + deliveryFee + platformFee - (coupon?.type === "free_delivery" ? 0 : discount));
  return { subtotal, deliveryFee, platformFee, discount, total, appliedCoupon: coupon && subtotal >= (coupon.minOrder || 0) ? coupon : null };
}
