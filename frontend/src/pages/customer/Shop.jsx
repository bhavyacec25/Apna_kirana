import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiSearch,
  FiStar,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiShoppingBag,
} from "react-icons/fi";
import Navbar from "../../components/Navbar";
import ProductCard from "../../components/ProductCard";
import { SkeletonGrid } from "../../components/Skeleton";
import { api } from "../../services/api";

export default function Shop() {
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get("/shops"), api.get(`/products?shopId=${shopId}`)])
      .then(([shopsRes, productsRes]) => {
        const found = shopsRes.shops.find((s) => s.id === shopId) || null;
        setShop(found);
        const stamped = productsRes.products.map((p) => ({
          ...p,
          shopName: found?.name,
        }));
        setProducts(stamped);
      })
      .finally(() => setLoading(false));
  }, [shopId]);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const filtered = products.filter((p) => {
    const matchesCategory = category === "All" || p.category === category;
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-brand-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <Navbar />

      {/* Shop Hero Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-brand-600 to-teal-700 text-white px-4 sm:px-8 py-8 shadow-lg">
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="max-w-6xl mx-auto relative z-10">
          <Link
            to="/customer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md mb-4 transition-colors"
          >
            <FiArrowLeft size={13} /> Back to all shops
          </Link>

          {shop ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-inner shrink-0">
                  🏪
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
                      {shop.name}
                    </h1>
                    <FiCheckCircle className="text-emerald-300 text-base" title="Verified Merchant" />
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100 flex items-center gap-1 mt-0.5">
                    <FiMapPin size={13} /> {shop.area}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg">
                      <FiStar size={12} className="fill-amber-300 text-amber-300" /> {shop.rating || "4.8"}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg">
                      <FiClock size={12} /> {shop.deliveryTime || "25-35 mins"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-2.5 text-xs text-emerald-100 self-start sm:self-auto">
                <p className="font-bold text-white">Minimum Order: ₹350</p>
                <p className="text-[11px] text-white/80">for online door delivery</p>
              </div>
            </motion.div>
          ) : (
            <div className="h-20 flex items-center">
              <h1 className="text-2xl font-bold">Loading shop details...</h1>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-3 pt-6">
        {/* Search inside shop */}
        <div className="card p-3 mb-4 flex items-center gap-3 shadow-sm bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
          <FiSearch className="text-gray-400 shrink-0" size={16} />
          <input
            className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 font-medium"
            placeholder="Search items in this shop (e.g. Milk, Atta, Bread)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs font-semibold text-gray-400 hover:text-gray-700 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 shadow-xs ${
                category === c
                  ? "bg-brand-600 text-white shadow-md shadow-brand-200 dark:shadow-none scale-105"
                  : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <SkeletonGrid
            count={8}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence>
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="col-span-full card p-12 text-center my-6">
                <FiShoppingBag className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-3" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">
                  No products found
                </h3>
                <p className="text-gray-500 text-sm">
                  Try clearing your search or selecting another category.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
