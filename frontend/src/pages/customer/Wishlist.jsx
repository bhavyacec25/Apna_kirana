import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiHeart, FiArrowLeft, FiShoppingBag } from "react-icons/fi";
import Navbar from "../../components/Navbar";
import ProductCard from "../../components/ProductCard";
import { SkeletonGrid } from "../../components/Skeleton";
import { getWishlist } from "../../services/wishlistService";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getWishlist()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleWishlistChange(productId, isNowWishlisted) {
    if (!isNowWishlisted) {
      setItems((prev) => prev.filter((p) => p.id !== productId));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/20 to-brand-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-rose-600 via-pink-600 to-brand-600 text-white px-4 sm:px-8 py-8 shadow-lg">
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/customer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md mb-3 transition-colors"
            >
              <FiArrowLeft size={13} /> Back to shops
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              My Wishlist
            </h1>
            <p className="text-rose-100 text-xs sm:text-sm mt-0.5">
              Favorite grocery items saved for quick re-ordering
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs font-bold self-start sm:self-auto">
            {items.length} Saved {items.length === 1 ? "Item" : "Items"}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-3 pt-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <SkeletonGrid count={8} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" />
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-12 text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm my-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner">
              ❤️
            </div>
            <h2 className="font-display font-black text-xl mb-1 text-gray-900 dark:text-white">
              Your Wishlist is Empty
            </h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Tap the heart icon on any product card while browsing to save it to your wishlist.
            </p>
            <Link
              to="/customer"
              className="btn-primary inline-flex items-center gap-2 text-sm px-6 py-3 font-bold rounded-2xl shadow-lg"
            >
              <FiShoppingBag size={16} /> Browse Grocery Shops
            </Link>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {items.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <ProductCard
                    product={product}
                    initiallyWishlisted
                    onWishlistChange={handleWishlistChange}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
