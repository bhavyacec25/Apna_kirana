import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiStar,
  FiClock,
  FiMapPin,
  FiSearch,
  FiShield,
  FiArrowRight,
  FiCheckCircle,
  FiShoppingBag,
  FiTruck,
} from "react-icons/fi";
import Navbar from "../../components/Navbar";
import { SkeletonGrid, SkeletonRow } from "../../components/Skeleton";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const CATEGORY_CHIPS = [
  { label: "All Shops", emoji: "🛒" },
  { label: "Daily Groceries", emoji: "🥦" },
  { label: "Dairy & Bread", emoji: "🥛" },
  { label: "Snacks & Drinks", emoji: "🍿" },
  { label: "Personal Care", emoji: "🧴" },
];

export default function Home() {
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("All Shops");

  useEffect(() => {
    api
      .get("/shops")
      .then((res) => setShops(res.shops))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredShops = shops.filter((shop) => {
    const q = search.toLowerCase();
    return (
      !q ||
      shop.name.toLowerCase().includes(q) ||
      shop.area.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/25 to-brand-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <Navbar />

      {/* Hero 3D Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-emerald-600 to-teal-700 text-white px-4 sm:px-8 py-10 sm:py-14 shadow-xl">
        {/* Floating gradient glow orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold mb-3 border border-white/20 shadow-xs">
                <span className="animate-ping w-2 h-2 rounded-full bg-emerald-300" />
                ⚡ Superfast 10-30 min delivery near you
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-white drop-shadow-sm">
                Groceries Delivered from <br className="hidden sm:inline" />
                <span className="text-emerald-200 underline decoration-emerald-400/50">Your Trusted Kirana</span>
              </h1>
              <p className="text-white/90 text-sm sm:text-base mt-2 max-w-xl">
                Fresh milk, breads, daily staples & essentials straight from certified local neighborhood shops.
              </p>
            </div>

            {/* Quick feature highlights card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-3xl p-5 text-white max-w-xs shrink-0 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                  🛵
                </div>
                <div>
                  <p className="font-bold text-sm">Live GPS Tracking</p>
                  <p className="text-xs text-emerald-100">Know where your rider is</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/90 border-t border-white/20 pt-2.5">
                <FiCheckCircle className="text-emerald-300" />
                <span>Govt. GST &amp; FSSAI verified shops</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Interactive Search inside banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 max-w-2xl"
          >
            <div className="relative flex items-center">
              <FiSearch className="absolute left-4 text-gray-400 text-lg" />
              <input
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-gray-900 placeholder-gray-400 text-sm font-medium shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-300/40 transition-all"
                placeholder="Search shops by name, locality or area (e.g. Model Town)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 text-xs font-bold text-gray-400 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 -mt-3 pt-6">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {CATEGORY_CHIPS.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setActiveChip(cat.label)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 shadow-xs ${
                activeChip === cat.label
                  ? "bg-brand-600 text-white shadow-md shadow-brand-200 dark:shadow-none scale-105"
                  : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-gray-900 dark:text-white">
              Shops Ready To Deliver
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select your favorite neighborhood store to browse fresh items
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
            {filteredShops.length} Open Shops
          </span>
        </div>

        {loading && (
          <SkeletonGrid
            count={4}
            Component={SkeletonRow}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          />
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredShops.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-12 text-center my-6"
          >
            <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4 text-3xl">
              🔍
            </div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
              No shops found
            </h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
              We couldn't find any shops matching "{search}". Try searching another area or clear your search.
            </p>
            <button
              onClick={() => setSearch("")}
              className="btn-primary text-xs px-5 py-2.5"
            >
              Show All Shops
            </button>
          </motion.div>
        )}

        {/* Shops Grid with 3D hover effects */}
        <motion.div
          layout
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <AnimatePresence>
            {filteredShops.map((shop, i) => (
              <motion.div
                key={shop.id}
                layout
                initial={{ opacity: 0, y: 25, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  delay: i * 0.05,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{
                  y: -6,
                  transition: { duration: 0.2 },
                }}
              >
                <Link
                  to={`/customer/shop/${shop.id}`}
                  className="card p-5 block group relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-brand-100/50 dark:hover:shadow-none transition-all duration-300"
                >
                  {/* Subtle top gradient accent */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 to-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start gap-4">
                    {/* Shop avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-inner">
                      🏪
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display font-extrabold text-gray-900 dark:text-white text-base truncate group-hover:text-brand-600 transition-colors">
                          {shop.name}
                        </h3>
                        <span title="GST & Merchant Verified">
                          <FiCheckCircle className="text-emerald-500 text-xs shrink-0" />
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 truncate">
                        <FiMapPin size={12} className="text-brand-500 shrink-0" /> {shop.area}
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                          <FiStar size={11} className="fill-amber-400 text-amber-500" /> {shop.rating || "4.8"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                          <FiClock size={11} className="text-gray-400" /> {shop.deliveryTime || "25-35 mins"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card bottom bar */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium">Free delivery over ₹350</span>
                    <span className="text-brand-600 dark:text-brand-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Menu <FiArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
