import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiGrid, FiShoppingBag, FiList, FiUsers, FiLogOut, FiShield } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function AdminNavbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const tabs = [
    { to: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
    { to: "/admin/shops", label: "Shops & Legal", icon: FiShoppingBag },
    { to: "/admin/orders", label: "Orders", icon: FiList },
    { to: "/admin/users", label: "Team & Users", icon: FiUsers },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-xs transition-all">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/admin/dashboard" className="flex items-center gap-2 group shrink-0">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-xl shadow-md shadow-purple-200/50 text-white"
          >
            🛡️
          </motion.div>
          <div>
            <span className="font-display font-black text-lg text-gray-900 dark:text-white leading-none tracking-tight block">
              Apna<span className="text-purple-600">Admin</span>
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
              Control Panel
            </span>
          </div>
        </Link>

        {/* Navigation Tabs with Spring Active Pill */}
        <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="admin-nav-pill"
                    className="absolute inset-0 bg-white dark:bg-gray-900 rounded-xl shadow-sm"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon size={14} /> {label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Logout Admin"
          >
            <FiLogOut size={17} />
          </button>
        </div>
      </div>
    </nav>
  );
}
