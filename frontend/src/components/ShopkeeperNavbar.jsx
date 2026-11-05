import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiGrid, FiList, FiLogOut, FiBox, FiShield } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function ShopkeeperNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const tabs = [
    { to: "/shopkeeper/dashboard", label: "Dashboard", icon: FiGrid },
    { to: "/shopkeeper/orders", label: "Orders", icon: FiList },
    { to: "/shopkeeper/products", label: "Products", icon: FiBox },
    { to: "/shopkeeper/legal", label: "Legal & GST", icon: FiShield },
  ];

  return (
    <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-emerald-600 flex items-center justify-center text-lg shadow-md shadow-brand-200">
            🏪
          </div>
          <div className="hidden sm:block">
            <p className="font-extrabold text-sm text-brand-800 leading-none">{user?.shopName || "My Shop"}</p>
            <p className="text-[10px] text-gray-400 font-medium">Shopkeeper Panel</p>
          </div>
        </motion.div>

        {/* Nav Tabs */}
        <div className="flex items-center gap-0.5 bg-gray-100/80 rounded-2xl p-1">
          {tabs.map(({ to, label, icon: Icon }, i) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 text-xs font-bold rounded-xl px-3 py-2 transition-all duration-200 ${
                  active ? "text-brand-700" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white rounded-xl shadow-md"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <FiLogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
