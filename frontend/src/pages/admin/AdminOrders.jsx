import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiInbox, FiFilter, FiDownload, FiUser, FiHome, FiCalendar, FiClock } from "react-icons/fi";
import AdminNavbar from "../../components/AdminNavbar";
import StatusBadge from "../../components/StatusBadge";
import { SkeletonGrid, SkeletonRow } from "../../components/Skeleton";
import { getAllOrdersAdmin } from "../../services/adminService";
import { normalizeOrderForDisplay } from "../../services/orderService";

const FILTERS = ["All", "Pending", "Accepted", "Packed", "Out for Delivery", "Delivered", "Cancelled"];

const FILTER_COLORS = {
  All: "from-gray-500 to-gray-600",
  Pending: "from-amber-500 to-orange-500",
  Accepted: "from-blue-500 to-indigo-600",
  Packed: "from-violet-500 to-purple-600",
  "Out for Delivery": "from-sky-500 to-cyan-600",
  Delivered: "from-emerald-500 to-green-600",
  Cancelled: "from-red-400 to-rose-500",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    getAllOrdersAdmin()
      .then((data) => setOrders(data.map(normalizeOrderForDisplay)))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    const matchesFilter = filter === "All" || o.status === filter;
    const q = search.toLowerCase();
    return (
      matchesFilter &&
      (!q ||
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        (o.shopName || "").toLowerCase().includes(q))
    );
  });

  const counts = {};
  FILTERS.forEach((f) => {
    counts[f] = f === "All" ? orders.length : orders.filter((o) => o.status === f).length;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <AdminNavbar />

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-900 text-white px-4 sm:px-8 py-8 shadow-lg">
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-purple-200 text-xs font-bold uppercase tracking-wider mb-1 block">
              Logistics Monitor
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              Global Platform Orders
            </h1>
            <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
              Track live deliveries, review shop fulfillment &amp; customer receipts
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs font-bold self-start sm:self-auto">
            Total Logged: {orders.length} orders
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-3 pt-6">
        {/* Search */}
        <div className="card p-3 mb-4 flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
          <FiSearch className="text-gray-400 shrink-0" size={16} />
          <input
            className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 font-medium"
            placeholder="Search by Order ID, Customer name, or Shop name..."
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

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 shadow-xs ${
                filter === f
                  ? `bg-gradient-to-r ${FILTER_COLORS[f]} text-white shadow-md scale-105`
                  : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              {f}
              {counts[f] > 0 && (
                <span
                  className={`ml-1.5 text-[10px] font-bold ${
                    filter === f ? "text-white/80" : "text-gray-400"
                  }`}
                >
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonGrid
            count={6}
            Component={SkeletonRow}
            className="space-y-3"
          />
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center my-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl">
            <FiInbox className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
              No orders found
            </h3>
            <p className="text-gray-500 text-sm">Try choosing another status filter.</p>
          </div>
        ) : (
          <motion.div layout className="space-y-3.5">
            <AnimatePresence>
              {filtered.map((order, i) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className="card p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-50 dark:border-gray-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 dark:text-white text-base">
                          {order.id}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <FiUser size={12} className="text-brand-500" /> {order.customer}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiHome size={12} className="text-purple-500" /> {order.shopName || "Local Kirana"}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiCalendar size={12} /> {order.date}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="font-black text-brand-700 dark:text-brand-400 text-lg">
                        ₹{order.total}
                      </span>
                      <p className="text-[11px] text-gray-400">Total Billed</p>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <p className="text-gray-600 dark:text-gray-300">
                      <strong>Items:</strong> {order.items?.map((it) => `${it.name} (${it.qty})`).join(", ") || "Grocery essentials"}
                    </p>
                    {order.riderName && (
                      <span className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 shrink-0">
                        🛵 Rider: <strong>{order.riderName}</strong>
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
