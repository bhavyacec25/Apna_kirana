import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiShoppingCart, FiUser, FiLogOut, FiPackage, FiHeart, FiSearch } from "react-icons/fi";
import { getCart } from "../services/cartService";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      const cart = getCart();
      setCartCount(cart.reduce((sum, i) => sum + i.quantity, 0));
    };
    sync();
    window.addEventListener("cart-updated", sync);
    return () => window.removeEventListener("cart-updated", sync);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const navLinks = [
    { to: "/customer", label: "Shops", icon: FiSearch },
    { to: "/customer/orders", label: "Orders", icon: FiPackage },
    { to: "/customer/wishlist", label: "Wishlist", icon: FiHeart },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-xs transition-all">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link to="/customer" className="flex items-center gap-2 group shrink-0">
          <motion.div
            whileHover={{ rotate: 12, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center text-xl shadow-md shadow-brand-200/50 text-white"
          >
            🏪
          </motion.div>
          <div>
            <span className="font-display font-extrabold text-lg text-brand-700 dark:text-brand-400 leading-none tracking-tight block">
              Apna<span className="text-emerald-600">Kirana</span>
            </span>
            <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Local Grocery</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-2xl">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "text-brand-700 dark:text-brand-300"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="customer-nav-pill"
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
        <div className="flex items-center gap-2.5">
          {/* Cart button */}
          <Link
            to="/customer/cart"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 hover:bg-brand-100 transition-colors"
            title="Cart"
          >
            <FiShoppingCart size={19} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[11px] font-black rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow-md animate-pulse"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* User Name Chip */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-gray-100/70 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <span className="max-w-[90px] truncate">{user.name?.split(" ")[0] || "User"}</span>
            </div>
          )}

          <ThemeToggle />

          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Logout"
          >
            <FiLogOut size={17} />
          </button>
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="flex md:hidden border-t border-gray-100 dark:border-gray-800 px-4 py-1.5 justify-around bg-white/50 dark:bg-gray-900/50">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1 py-1 px-3 rounded-lg text-xs font-bold transition-colors ${
                active ? "text-brand-600 bg-brand-50 dark:bg-brand-950" : "text-gray-500"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
