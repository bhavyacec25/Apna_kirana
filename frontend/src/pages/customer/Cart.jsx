import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiShoppingBag,
  FiTag,
  FiCheckCircle,
  FiX,
  FiTruck,
  FiArrowRight,
  FiShield,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import CartItem from "../../components/CartItem";
import {
  getCart,
  updateCartQuantity,
  removeFromCart,
  getCartTotals,
  AVAILABLE_COUPONS,
  validateCoupon,
  saveAppliedCoupon,
  removeAppliedCoupon,
} from "../../services/cartService";

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    const sync = () => setCartItems(getCart());
    sync();
    window.addEventListener("cart-updated", sync);
    return () => window.removeEventListener("cart-updated", sync);
  }, []);

  const { subtotal, deliveryFee, platformFee, discount, total, appliedCoupon } =
    getCartTotals(cartItems);

  const MIN_DELIVERY_SUBTOTAL = 350;
  const FREE_DELIVERY_TARGET = 500;
  const eligibleForDelivery = subtotal >= MIN_DELIVERY_SUBTOTAL;
  const amountNeeded = Math.max(0, MIN_DELIVERY_SUBTOTAL - subtotal);
  const amountForFreeDel = Math.max(0, FREE_DELIVERY_TARGET - subtotal);

  // Delivery meter progress (0 to 100%)
  const deliveryProgress = Math.min(
    100,
    Math.round((subtotal / FREE_DELIVERY_TARGET) * 100)
  );

  function handleQuantityChange(id, qty) {
    setCartItems(updateCartQuantity(id, qty));
  }

  function handleRemove(id) {
    setCartItems(removeFromCart(id));
  }

  function handleApplyCoupon(codeToApply) {
    const code = codeToApply || couponInput;
    setCouponError("");
    if (!code || !code.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    try {
      const valid = validateCoupon(code, subtotal);
      saveAppliedCoupon(valid);
      setCouponInput("");
      toast.success(`Coupon ${valid.code} applied! Saved discount on your order.`);
    } catch (err) {
      setCouponError(err.message);
      toast.error(err.message);
    }
  }

  function handleRemoveCoupon() {
    removeAppliedCoupon();
    toast("Coupon removed", { icon: "🏷️" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-brand-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <Navbar />

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-emerald-600 to-teal-700 text-white px-4 sm:px-8 py-8 shadow-lg">
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="max-w-3xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/customer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md mb-3 transition-colors"
            >
              <FiArrowLeft size={13} /> Continue Shopping
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              Your Grocery Cart
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items selected from your local kirana
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-xs font-bold self-start sm:self-auto">
            ⚡ Quick Doorstep Delivery
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-3 pt-6">
        {cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-12 text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm my-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner">
              🛒
            </div>
            <h2 className="font-display font-black text-xl mb-1 text-gray-900 dark:text-white">
              Your Cart is Empty
            </h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Looks like you haven't added anything yet. Explore fresh vegetables, breads, milk, and daily essentials!
            </p>
            <Link to="/customer" className="btn-primary inline-flex items-center gap-2 text-sm px-6 py-3 font-bold rounded-2xl shadow-lg">
              <FiShoppingBag size={16} /> Explore Neighborhood Shops
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Delivery Threshold & Free Delivery Meter */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm"
            >
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                  <FiTruck className="text-emerald-600 text-base" />
                  {!eligibleForDelivery ? (
                    <span className="text-amber-700 dark:text-amber-400">
                      Add ₹{amountNeeded} more to reach minimum order (₹350)
                    </span>
                  ) : amountForFreeDel > 0 ? (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Add ₹{amountForFreeDel} more for <strong>FREE Delivery!</strong>
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                      <FiCheckCircle /> You unlocked FREE Delivery! 🎉
                    </span>
                  )}
                </span>
                <span className="text-gray-400 font-mono text-[11px]">{deliveryProgress}%</span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${deliveryProgress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full transition-all ${
                    deliveryProgress >= 100
                      ? "bg-gradient-to-r from-emerald-500 to-green-500"
                      : deliveryProgress >= 70
                      ? "bg-gradient-to-r from-brand-500 to-emerald-500"
                      : "bg-gradient-to-r from-amber-400 to-orange-500"
                  }`}
                />
              </div>
            </motion.div>

            {/* Cart Items List */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card p-4 sm:p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm space-y-3"
            >
              <h2 className="font-display font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <span>Items in Cart</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {cartItems.length} items
                </span>
              </h2>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-2.5 first:pt-1 last:pb-1">
                    <CartItem
                      item={item}
                      onQuantityChange={handleQuantityChange}
                      onRemove={handleRemove}
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Coupon Code Section */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-4 sm:p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <FiTag className="text-emerald-600" />
                <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white">
                  Offers &amp; Coupons
                </h3>
              </div>

              {appliedCoupon ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🎉</span>
                    <div>
                      <p className="font-extrabold text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                        <span className="font-mono bg-emerald-200 dark:bg-emerald-800 px-1.5 py-0.5 rounded">
                          {appliedCoupon.code}
                        </span>
                        <span>Applied Successfully!</span>
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {appliedCoupon.desc} · You save <strong>₹{discount}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Remove coupon"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <input
                      className="input uppercase tracking-wider font-mono text-xs font-bold"
                      placeholder="ENTER PROMO CODE (e.g. APNA50)"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    />
                    <button
                      onClick={() => handleApplyCoupon()}
                      className="btn-primary text-xs px-5 py-2.5 font-extrabold shrink-0"
                    >
                      Apply
                    </button>
                  </div>

                  {couponError && (
                    <p className="text-xs text-red-500 font-semibold mb-3">{couponError}</p>
                  )}

                  {/* 1-Tap Coupon Recommendation Pills */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {AVAILABLE_COUPONS.map((cp) => (
                      <button
                        key={cp.code}
                        onClick={() => handleApplyCoupon(cp.code)}
                        className="text-left bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 p-2.5 rounded-2xl text-xs transition-all group flex items-center gap-2"
                      >
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded text-[10px] group-hover:scale-105 transition-transform">
                          {cp.code}
                        </span>
                        <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                          {cp.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>

            {/* Bill Summary */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm space-y-2.5 text-xs sm:text-sm"
            >
              <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white pb-1 border-b border-gray-50 dark:border-gray-800">
                Bill Summary
              </h3>

              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Items Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{subtotal}</span>
              </div>

              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Delivery Partner Fee</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Platform &amp; Handling Fee</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{platformFee}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-₹{discount}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-base sm:text-lg border-t border-gray-100 dark:border-gray-800 pt-3 mt-2 text-gray-900 dark:text-white">
                <span>To Pay</span>
                <span className="text-brand-700 dark:text-brand-400">₹{total}</span>
              </div>
            </motion.div>

            {/* Minimum Delivery Threshold Notice */}
            {!eligibleForDelivery && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🚚</span>
                  <span>
                    Online delivery requires a minimum item bill of <strong>₹350</strong>. Add{" "}
                    <strong className="text-amber-700 dark:text-amber-300">₹{amountNeeded}</strong> more items to proceed.
                  </span>
                </div>
                <Link
                  to="/customer"
                  className="bg-amber-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors self-start sm:self-auto shrink-0"
                >
                  + Add More Items
                </Link>
              </motion.div>
            )}

            {/* Checkout Action Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/customer/checkout")}
              disabled={!eligibleForDelivery}
              className={`w-full py-4 text-sm font-extrabold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                eligibleForDelivery
                  ? "bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white shadow-emerald-200/50"
                  : "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed shadow-none"
              }`}
            >
              {eligibleForDelivery ? (
                <>
                  Proceed to Checkout · ₹{total} <FiArrowRight size={16} />
                </>
              ) : (
                `Add ₹${amountNeeded} More for Online Delivery`
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
