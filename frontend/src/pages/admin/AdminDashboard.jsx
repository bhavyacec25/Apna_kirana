import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  FiShoppingBag,
  FiDollarSign,
  FiUsers,
  FiHome,
  FiClock,
  FiShield,
  FiArrowRight,
  FiCheckCircle,
  FiPlus,
} from "react-icons/fi";
import AdminNavbar from "../../components/AdminNavbar";
import { SkeletonGrid, SkeletonStat } from "../../components/Skeleton";
import { getAdminStats } from "../../services/adminService";

/* ── 3D Tilt Card Component ── */
function TiltCard({ children, className = "", delay = 0 }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [7, -7]);
  const rotateY = useTransform(x, [-60, 60], [-7, 7]);

  function onMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  }
  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated Number Counter ── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof value !== "number") return;
    let start = 0;
    const step = Math.ceil(value / 30) || 1;
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  const cardConfig = [
    {
      label: "Total Orders",
      value: stats?.totalOrders,
      icon: FiShoppingBag,
      gradient: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
      glow: "shadow-blue-100",
    },
    {
      label: "Total Revenue (Delivered)",
      value: stats?.totalRevenue,
      prefix: "₹",
      icon: FiDollarSign,
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
      glow: "shadow-emerald-100",
    },
    {
      label: "Registered Shops",
      value: stats?.totalShops,
      icon: FiHome,
      gradient: "from-purple-500 to-indigo-600",
      bgLight: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
      glow: "shadow-purple-100",
    },
    {
      label: "Pending Approvals",
      value: stats?.pendingShops,
      icon: FiClock,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
      glow: "shadow-amber-100",
    },
    {
      label: "Total Customers",
      value: stats?.totalCustomers,
      icon: FiUsers,
      gradient: "from-sky-500 to-blue-600",
      bgLight: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",
      glow: "shadow-sky-100",
    },
    {
      label: "Total Shopkeepers",
      value: stats?.totalShopkeepers,
      icon: FiShield,
      gradient: "from-rose-500 to-pink-600",
      bgLight: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
      glow: "shadow-rose-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <AdminNavbar />

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white px-4 sm:px-8 py-10 shadow-xl">
        <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <span className="px-3 py-1 rounded-full bg-white/15 text-purple-200 text-xs font-bold uppercase tracking-wider mb-2 inline-block border border-white/15">
                ⚡ Platform Real-time Monitor
              </span>
              <h1 className="text-3xl sm:text-4xl font-black font-display text-white">
                Admin Control Center
              </h1>
              <p className="text-purple-100 text-sm mt-1">
                Live operational health across every shop, rider &amp; order on ApnaKirana
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/admin/users?tab=admins&openAdd=true"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                <FiPlus size={14} /> Add Admin Member
              </Link>
              <Link
                to="/admin/shops"
                className="inline-flex items-center gap-2 bg-white text-purple-900 font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-lg hover:bg-purple-50 transition-all"
              >
                <FiPlus size={14} /> Invite Shopkeeper
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-4 pt-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Pending approvals alert banner */}
        {stats && stats.pendingShops > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5 mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
                ⏳
              </div>
              <div>
                <p className="font-black text-base">
                  {stats.pendingShops} Shopkeeper Registration{stats.pendingShops > 1 ? "s" : ""} Pending Review
                </p>
                <p className="text-xs text-amber-100 mt-0.5">
                  Inspect their GSTIN, FSSAI papers, and approve shops to make them visible to customers.
                </p>
              </div>
            </div>
            <Link
              to="/admin/shops"
              className="inline-flex items-center gap-1.5 bg-white text-amber-800 font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md hover:bg-amber-50 transition-all self-start sm:self-auto shrink-0"
            >
              Review Papers <FiArrowRight size={13} />
            </Link>
          </motion.div>
        )}

        {/* 3D Stat Cards Grid */}
        {!stats ? (
          <SkeletonGrid
            count={6}
            Component={SkeletonStat}
            className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-8"
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {cardConfig.map((card, i) => {
              const numVal = typeof card.value === "number" ? card.value : null;
              const Icon = card.icon;
              return (
                <TiltCard key={card.label} delay={i * 0.06}>
                  <div
                    className={`card p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-xl transition-all relative overflow-hidden`}
                  >
                    {/* Corner gradient glow */}
                    <div
                      className={`pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-xl`}
                    />

                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.bgLight}`}
                      >
                        <Icon size={19} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Live Stat
                      </span>
                    </div>

                    <p className="text-3xl sm:text-4xl font-extrabold font-display text-gray-900 dark:text-white">
                      {card.prefix || ""}
                      {numVal !== null ? <AnimatedNumber value={numVal} /> : (card.value ?? "-")}
                    </p>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                      {card.label}
                    </p>

                    <div
                      className={`mt-3 h-1.5 rounded-full bg-gradient-to-r ${card.gradient} opacity-40`}
                    />
                  </div>
                </TiltCard>
              );
            })}
          </div>
        )}

        {/* Fast Action Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/users?tab=admins"
            className="card p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🛡️
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                Admin Team
              </p>
              <p className="text-xs text-gray-500">Scale operations &amp; add admins</p>
            </div>
          </Link>

          <Link
            to="/admin/shops"
            className="card p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🏛️
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                Shops &amp; Legal
              </p>
              <p className="text-xs text-gray-500">Approve GST &amp; FSSAI licenses</p>
            </div>
          </Link>

          <Link
            to="/admin/orders"
            className="card p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              📦
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                Global Orders Log
              </p>
              <p className="text-xs text-gray-500">Filter and audit deliveries</p>
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="card p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              👥
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                User Management
              </p>
              <p className="text-xs text-gray-500">Manage customers &amp; accounts</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
