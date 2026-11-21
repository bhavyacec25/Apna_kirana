import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiShoppingCart, FiUser, FiLogOut, FiPackage, FiHeart, FiSearch, FiHome } from "react-icons/fi";
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
    <>
      {/* Top Header Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-xs transition-all">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand */}
          <Link to="/customer" className="flex items-center gap-2 group shrink-0">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center text-lg sm:text-xl shadow-md shadow-brand-200/50 text-white"
            >
              🏪
            </motion.div>
            <div>
              <span className="font-display font-extrabold text-base sm:text-lg text-brand-700 dark:text-brand-400 leading-none tracking-tight block">
                Apna<span className="text-emerald-600">Kirana</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 font-semibold tracking-wider uppercase">10-Min Kirana</span>
            </div>
          </Link>

          {/* Center Nav Links (Desktop) */}
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
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Cart button (Desktop & Header) */}
            <Link
              to="/customer/cart"
              className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 hover:bg-brand-100 transition-colors"
              title="Cart"
            >
              <FiShoppingCart size={18} />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-black rounded-full min-w-[18px] h-4.5 px-1 flex items-center justify-center shadow-md animate-pulse"
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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Logout"
            >
              <FiLogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Native App-Style Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 py-1.5 px-3 flex items-center justify-around shadow-2xl safe-area-pb">
        <Link
          to="/customer"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            location.pathname === "/customer"
              ? "text-brand-600 dark:text-brand-400 font-extrabold"
              : "text-gray-500 dark:text-gray-400 font-medium"
          }`}
        >
          <FiHome size={18} />
          <span className="text-[10px] mt-0.5">Shops</span>
        </Link>

        <Link
          to="/customer/orders"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            location.pathname.startsWith("/customer/orders") || location.pathname.startsWith("/customer/order-tracking")
              ? "text-brand-600 dark:text-brand-400 font-extrabold"
              : "text-gray-500 dark:text-gray-400 font-medium"
          }`}
        >
          <FiPackage size={18} />
          <span className="text-[10px] mt-0.5">Orders</span>
        </Link>

        <Link
          to="/customer/wishlist"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            location.pathname === "/customer/wishlist"
              ? "text-brand-600 dark:text-brand-400 font-extrabold"
              : "text-gray-500 dark:text-gray-400 font-medium"
          }`}
        >
          <FiHeart size={18} />
          <span className="text-[10px] mt-0.5">Wishlist</span>
        </Link>

        <Link
          to="/customer/cart"
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            location.pathname === "/customer/cart"
              ? "text-brand-600 dark:text-brand-400 font-extrabold"
              : "text-gray-500 dark:text-gray-400 font-medium"
          }`}
        >
          <div className="relative">
            <FiShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Cart</span>
        </Link>
      </div>
    </>
  );
}
