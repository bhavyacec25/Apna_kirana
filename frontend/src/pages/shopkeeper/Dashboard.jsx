import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import {
  FiShoppingBag, FiDollarSign, FiUsers, FiTrendingUp,
  FiArrowRight, FiShield, FiPackage, FiCheckCircle
} from "react-icons/fi";
import ShopkeeperNavbar from "../../components/ShopkeeperNavbar";
import StatusBadge from "../../components/StatusBadge";
import { SkeletonGrid, SkeletonStat } from "../../components/Skeleton";
import { getDashboardStats, normalizeOrderForDisplay } from "../../services/orderService";
import { getSocket } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";

/* ── Tilt 3-D card wrapper ───────────────────────────────────── */
function TiltCard({ children, className = "", delay = 0 }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [8, -8]);
  const rotateY = useTransform(x, [-60, 60], [-8, 8]);

  function onMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  }
  function onMouseLeave() { x.set(0); y.set(0); }

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated Counter ────────────────────────────────────────── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof value !== "number") return;
    let start = 0;
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

const STAT_COLORS = [
  {
    bg: "from-blue-500 to-indigo-600",
    light: "bg-blue-50",
    icon: "text-blue-500",
    glow: "shadow-blue-200",
  },
  {
    bg: "from-emerald-500 to-green-600",
    light: "bg-emerald-50",
    icon: "text-emerald-500",
    glow: "shadow-emerald-200",
  },
  {
    bg: "from-violet-500 to-purple-600",
    light: "bg-violet-50",
    icon: "text-violet-500",
    glow: "shadow-violet-200",
  },
  {
    bg: "from-amber-500 to-orange-500",
    light: "bg-amber-50",
    icon: "text-amber-500",
    glow: "shadow-amber-200",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  function load() {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    const socket = getSocket();
    socket.on("order:new", load);
    socket.on("order:status", load);
    return () => {
      clearInterval(interval);
      socket.off("order:new", load);
      socket.off("order:status", load);
    };
  }, []);

  const latest = stats?.latestOrder ? normalizeOrderForDisplay(stats.latestOrder) : null;

  const cards = [
    { label: "Today's Orders", rawValue: stats?.todaysOrderCount, icon: FiShoppingBag },
    { label: "Revenue (Delivered)", rawValue: stats?.revenue, prefix: "₹", icon: FiDollarSign },
    { label: "Total Orders", rawValue: stats?.totalOrders, icon: FiTrendingUp },
    { label: "Customers", rawValue: stats?.uniqueCustomers, icon: FiUsers },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-emerald-50/20">
      <ShopkeeperNavbar />

      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-brand-700 to-emerald-700 text-white px-6 py-10">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-brand-200 text-sm font-semibold uppercase tracking-widest mb-1">
              Welcome back, {user?.name?.split(" ")[0] || "Shopkeeper"} 👋
            </p>
            <h1 className="text-3xl font-extrabold drop-shadow">Dashboard</h1>
            <p className="text-brand-100 mt-1 text-sm">Live overview of your shop's performance.</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6 pb-12">

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 mb-4 text-sm">
            {error}
          </motion.p>
        )}

        {/* Pending warning */}
        <AnimatePresence>
          {user?.status === "pending" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="card p-4 mb-5 bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-3"
            >
              <span className="text-xl">⏳</span>
              <span>Your shop is <strong>awaiting admin approval</strong>. Customers won't see it in the shop list yet — you can still set up products in the meantime.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GST Legal Banner */}
        <TiltCard delay={0.05} className="mb-6">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-xl shadow-emerald-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
                  🏛️
                </div>
                <div>
                  <p className="font-bold text-sm">Government Authorized GST &amp; Legal Paperwork</p>
                  <p className="text-emerald-100 text-xs mt-0.5">
                    Register your GSTIN, FSSAI Food License, and business papers to get verified.
                  </p>
                </div>
              </div>
              <Link
                to="/shopkeeper/legal"
                className="shrink-0 bg-white text-emerald-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
              >
                <FiShield size={13} /> Manage Legal
              </Link>
            </div>
          </div>
        </TiltCard>

        {/* Stat Cards */}
        {!stats ? (
          <SkeletonGrid count={4} Component={SkeletonStat} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(({ label, rawValue, prefix = "", icon: Icon }, i) => {
              const color = STAT_COLORS[i];
              const numVal = typeof rawValue === "number" ? rawValue : null;
              return (
                <TiltCard key={label} delay={0.1 + i * 0.07}>
                  <div className={`rounded-2xl bg-white border border-gray-100 p-5 shadow-lg ${color.glow} relative overflow-hidden`}>
                    {/* Gradient blob */}
                    <div className={`pointer-events-none absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${color.bg} opacity-10 blur-xl`} />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color.light}`}>
                      <Icon size={18} className={color.icon} />
                    </div>
                    <p className="text-3xl font-extrabold font-display text-gray-900">
                      {prefix}
                      {numVal !== null ? <AnimatedNumber value={numVal} /> : (rawValue ?? "-")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
                    <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${color.bg} opacity-50`} />
                  </div>
                </TiltCard>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {[
            { to: "/shopkeeper/products", icon: FiPackage, label: "Products", color: "from-blue-500 to-indigo-600" },
            { to: "/shopkeeper/orders", icon: FiShoppingBag, label: "Orders", color: "from-brand-500 to-emerald-600" },
            { to: "/shopkeeper/legal", icon: FiShield, label: "Legal & GST", color: "from-violet-500 to-purple-600" },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className={`bg-gradient-to-br ${color} text-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200`}
            >
              <Icon size={22} />
              <span className="text-xs font-bold">{label}</span>
            </Link>
          ))}
        </motion.div>

        {/* Latest Order */}
        {stats && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex items-center justify-between mb-3"
            >
              <h2 className="font-display font-bold text-lg text-gray-900">Latest Order</h2>
              <Link to="/shopkeeper/orders" className="text-sm text-brand-600 font-semibold hover:underline flex items-center gap-1">
                View all <FiArrowRight size={13} />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {latest ? (
                <div className="card p-5 hover:shadow-cardHover transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-display font-bold text-gray-900">{latest.id}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{latest.customer} · {latest.date}</p>
                    </div>
                    <StatusBadge status={latest.status} />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {latest.items.map((it) => `${it.name} × ${it.qty}`).join(", ")}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-brand-700 text-lg">₹{latest.total}</p>
                    <Link to="/shopkeeper/orders" className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:underline">
                      <FiCheckCircle size={12} /> Manage order
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="card p-10 text-center text-gray-400">
                  <FiShoppingBag className="mx-auto text-4xl mb-3 text-gray-300" />
                  <p className="font-semibold">No orders yet today.</p>
                  <p className="text-sm mt-1">Orders will appear here in real-time.</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
