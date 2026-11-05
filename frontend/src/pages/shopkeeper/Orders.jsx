import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiInbox, FiDownload, FiFilter } from "react-icons/fi";
import ShopkeeperNavbar from "../../components/ShopkeeperNavbar";
import OrderCard from "../../components/OrderCard";
import { SkeletonGrid, SkeletonRow } from "../../components/Skeleton";
import {
  getOrders,
  updateOrderStatus,
  normalizeOrderForDisplay,
  downloadOrdersCsv,
} from "../../services/orderService";
import { getSocket } from "../../services/socket";
import { notify } from "../../services/notify";

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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);

  function load() {
    setLoading(true);
    getOrders()
      .then((data) => setOrders(data.map(normalizeOrderForDisplay)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    const socket = getSocket();

    const handleNewOrder = (order) => {
      toast.success(`New order ${order.id} received!`);
      notify("New order received", `${order.customer} · ₹${order.total}`);
      setOrders((prev) => [normalizeOrderForDisplay(order), ...prev]);
    };
    const handleStatusUpdate = (order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? normalizeOrderForDisplay(order) : o))
      );
    };
    socket.on("order:new", handleNewOrder);
    socket.on("order:status", handleStatusUpdate);

    return () => {
      clearInterval(interval);
      socket.off("order:new", handleNewOrder);
      socket.off("order:status", handleStatusUpdate);
    };
  }, []);

  async function handleStatusChange(orderId, newStatus) {
    setUpdatingId(orderId);
    setError("");
    try {
      const updated = await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? normalizeOrderForDisplay(updated) : o))
      );
      toast.success(`Order ${orderId} marked ${newStatus}.`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleExportCsv() {
    try {
      await downloadOrdersCsv();
      toast.success("Orders exported");
    } catch (err) {
      toast.error(err.message);
    }
  }

  const filtered = orders.filter((o) => {
    const matchesFilter = filter === "All" || o.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const counts = {};
  FILTERS.forEach((f) => {
    counts[f] = f === "All" ? orders.length : orders.filter((o) => o.status === f).length;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/20 to-violet-50/10">
      <ShopkeeperNavbar />

      {/* Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-700 text-white px-6 py-10">
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-purple-300/10 blur-2xl" />
        <div className="max-w-6xl mx-auto relative flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-1">Live Updates</p>
            <h1 className="text-3xl font-extrabold drop-shadow">Orders</h1>
            <p className="text-violet-100 text-sm mt-1">{orders.length} total orders in your shop</p>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            <FiDownload size={15} /> Export CSV
          </motion.button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-4 pb-12">
        {error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4 border border-red-100"
          >
            {error}
          </motion.div>
        )}

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="card p-4 mb-4"
        >
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <FiFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
            <input
              className="input pl-10 pr-10"
              placeholder="Search by Order ID or Customer name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Animated Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide"
        >
          {FILTERS.map((f, i) => (
            <motion.button
              key={f}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              onClick={() => setFilter(f)}
              className={`relative px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                filter === f
                  ? `bg-gradient-to-r ${FILTER_COLORS[f]} text-white shadow-md scale-105`
                  : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              {f}
              {counts[f] > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold ${filter === f ? "text-white/80" : "text-gray-400"}`}>
                  {counts[f]}
                </span>
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* Skeleton */}
        {loading && orders.length === 0 && (
          <SkeletonGrid count={6} Component={SkeletonRow} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" />
        )}

        {/* Empty State */}
        <AnimatePresence>
          {!loading && filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="card p-12 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FiInbox className="text-3xl text-gray-300" />
              </div>
              <h2 className="font-display font-bold text-lg mb-1 text-gray-900">No orders here</h2>
              <p className="text-gray-500 text-sm">New customer orders will appear automatically in real‑time.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Cards with stagger */}
        <motion.div
          layout
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filtered.map((order, i) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`${updatingId === order.id ? "opacity-50 pointer-events-none" : ""} hover:-translate-y-1 transition-transform duration-200`}
              >
                <OrderCard order={order} onStatusChange={handleStatusChange} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
