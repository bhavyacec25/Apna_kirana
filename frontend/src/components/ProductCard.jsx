import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiMinus, FiCheck, FiHeart, FiClock, FiAlertTriangle } from "react-icons/fi";
import { addToCart, updateCartQuantity, getCart } from "../services/cartService";
import { addToWishlist, removeFromWishlist } from "../services/wishlistService";
import { useAuth } from "../context/AuthContext";

function isRealImageUrl(image) {
  return (
    typeof image === "string" &&
    (image.startsWith("/uploads/") ||
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:"))
  );
}

function getExpiryInfo(expiryDate) {
  if (!expiryDate) return null;
  const expiryTime = new Date(expiryDate + "T23:59:59").getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: "expired", label: "Expired", color: "bg-red-100 text-red-700 border-red-300" };
  }
  if (diffDays === 0) {
    return { status: "today", label: "Expires Today", color: "bg-amber-100 text-amber-800 border-amber-300" };
  }
  if (diffDays <= 2) {
    return {
      status: "urgent",
      label: `Expires in ${diffDays}d`,
      color: "bg-amber-50 text-amber-700 border-amber-300",
    };
  }
  return {
    status: "fresh",
    label: `Fresh till ${new Date(expiryDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`,
    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
  };
}

export default function ProductCard({ product, initiallyWishlisted = false, onWishlistChange }) {
  const { user } = useAuth();
  const [justAdded, setJustAdded] = useState(false);
  const [qtyInCart, setQtyInCart] = useState(0);
  const [wishlisted, setWishlisted] = useState(initiallyWishlisted);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const expiryInfo = getExpiryInfo(product.expiryDate);
  const isExpired = expiryInfo?.status === "expired";

  useEffect(() => setWishlisted(initiallyWishlisted), [initiallyWishlisted]);

  useEffect(() => {
    const sync = () => {
      const cart = getCart();
      const found = cart.find((i) => i.id === product.id);
      setQtyInCart(found ? found.quantity : 0);
    };
    sync();
    window.addEventListener("cart-updated", sync);
    return () => window.removeEventListener("cart-updated", sync);
  }, [product.id]);

  function handleAdd(e) {
    e.preventDefault();
    e.stopPropagation();

    if (isExpired) {
      toast.error("This item has expired and cannot be added to the cart.");
      return;
    }

    addToCart(product, 1);
    toast.success(`${product.name} added to cart`, { id: `cart-${product.id}` });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 800);
  }

  function handleIncrement(e) {
    e.preventDefault();
    e.stopPropagation();
    updateCartQuantity(product.id, qtyInCart + 1);
  }

  function handleDecrement(e) {
    e.preventDefault();
    e.stopPropagation();
    updateCartQuantity(product.id, qtyInCart - 1);
  }

  async function handleToggleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (user?.role !== "customer" || wishlistBusy) return;
    setWishlistBusy(true);
    const next = !wishlisted;
    setWishlisted(next);
    try {
      if (next) {
        await addToWishlist(product.id);
        toast.success("Saved to wishlist");
      } else {
        await removeFromWishlist(product.id);
        toast("Removed from wishlist", { icon: "💔" });
      }
      onWishlistChange?.(product.id, next);
    } catch (err) {
      setWishlisted(!next);
      toast.error(err.message);
    } finally {
      setWishlistBusy(false);
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`card p-3.5 flex flex-col justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-emerald-50 dark:hover:shadow-none transition-all relative group ${
        isExpired ? "opacity-65" : ""
      }`}
    >
      {/* Wishlist Button */}
      {user?.role === "customer" && (
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-md flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <FiHeart
            size={15}
            className={wishlisted ? "fill-red-500 text-red-500" : ""}
          />
        </motion.button>
      )}

      {/* Product Image */}
      <div>
        <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 flex items-center justify-center mb-3 overflow-hidden relative border border-gray-100 dark:border-gray-800">
          {isRealImageUrl(product.image) ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.innerHTML = `<span class="text-5xl">🛒</span>`;
              }}
            />
          ) : (
            <span className="text-5xl select-none group-hover:scale-110 transition-transform">🛒</span>
          )}

          {/* Expiry Badge */}
          {expiryInfo && (
            <div
              className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 shadow-xs backdrop-blur-xs ${expiryInfo.color}`}
            >
              {isExpired ? <FiAlertTriangle size={10} /> : <FiClock size={10} />}
              {expiryInfo.label}
            </div>
          )}
        </div>

        {/* Product Details */}
        <h3 className="font-display font-bold text-sm leading-snug mb-0.5 text-gray-900 dark:text-white line-clamp-1 group-hover:text-brand-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium">{product.unit}</p>
      </div>

      {/* Price & Action Bottom Row */}
      <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-800/80 flex items-center justify-between">
        <div>
          <span className="font-extrabold text-brand-700 dark:text-brand-400 text-base">
            ₹{product.price}
          </span>
        </div>

        {isExpired ? (
          <span className="text-[11px] font-bold text-red-600 bg-red-50 dark:bg-red-950 px-2.5 py-1 rounded-xl border border-red-200 dark:border-red-800">
            Unavailable
          </span>
        ) : qtyInCart > 0 ? (
          /* Interactive Stepper like Quick Commerce */
          <div className="flex items-center bg-brand-600 text-white rounded-xl shadow-md overflow-hidden">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleDecrement}
              className="px-2.5 py-1 hover:bg-brand-700 transition-colors text-xs font-bold"
              title="Reduce"
            >
              <FiMinus size={12} />
            </motion.button>
            <span className="px-2 text-xs font-black min-w-[20px] text-center">
              {qtyInCart}
            </span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleIncrement}
              className="px-2.5 py-1 hover:bg-brand-700 transition-colors text-xs font-bold"
              title="Add more"
            >
              <FiPlus size={12} />
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleAdd}
            className={`flex items-center gap-1.5 text-xs font-bold rounded-xl px-3.5 py-1.5 shadow-xs transition-all ${
              justAdded
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white"
            }`}
          >
            {justAdded ? (
              <>
                <FiCheck size={13} /> Added
              </>
            ) : (
              <>
                <FiPlus size={13} /> Add
              </>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
