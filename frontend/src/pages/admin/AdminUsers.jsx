import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { FiPhone, FiMail, FiUser, FiShield, FiCheckCircle, FiSlash, FiSearch } from "react-icons/fi";
import AdminNavbar from "../../components/AdminNavbar";
import { SkeletonGrid, SkeletonRow } from "../../components/Skeleton";
import { getAllUsers, updateUserStatus } from "../../services/adminService";

const ROLE_FILTERS = ["All", "customer", "shopkeeper"];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  function load() {
    setLoading(true);
    getAllUsers()
      .then(setUsers)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleToggleSuspend(user) {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    setUpdatingId(user.id);
    try {
      const updated = await updateUserStatus(user.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(newStatus === "suspended" ? "User suspended." : "User reactivated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = users
    .filter((u) => u.role !== "admin")
    .filter((u) => (roleFilter === "All" ? true : u.role === roleFilter))
    .filter((u) => {
      const q = search.toLowerCase();
      return (
        !q ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.shopName || "").toLowerCase().includes(q)
      );
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <AdminNavbar />

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white px-4 sm:px-8 py-8 shadow-lg">
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-purple-200 text-xs font-bold uppercase tracking-wider mb-1 block">
              User Directory
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              Platform Accounts
            </h1>
            <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
              Review customer accounts, shopkeeper roles, and security permissions
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs font-bold self-start sm:self-auto">
            {filtered.length} Registered Accounts
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-3 pt-6">
        {/* Search */}
        <div className="card p-3 mb-4 flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
          <FiSearch className="text-gray-400 shrink-0" size={16} />
          <input
            className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 font-medium"
            placeholder="Search users by name, phone number, email or shop..."
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

        {/* Role Filters */}
        <div className="flex gap-2 pb-3 mb-6">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-4 py-1.5 rounded-2xl text-xs font-bold capitalize transition-all duration-200 shadow-xs ${
                roleFilter === f
                  ? "bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none scale-105"
                  : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              {f === "All" ? "All Users" : `${f}s`}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonGrid count={5} Component={SkeletonRow} className="space-y-3" />
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence>
              {filtered.map((user, i) => (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="card p-4 sm:p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md ${
                        user.role === "shopkeeper"
                          ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                          : "bg-gradient-to-br from-brand-500 to-emerald-600"
                      }`}
                    >
                      {user.name ? user.name[0].toUpperCase() : "U"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-sm text-gray-900 dark:text-white">
                          {user.name || "Nameless User"}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            user.role === "shopkeeper"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <FiPhone size={12} className="text-gray-400" /> +91 {user.phone}
                          </span>
                        )}
                        {user.email && (
                          <span className="flex items-center gap-1">
                            <FiMail size={12} className="text-gray-400" /> {user.email}
                          </span>
                        )}
                        {user.shopName && (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            🏪 {user.shopName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl capitalize ${
                        user.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : user.status === "pending"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {user.status || "active"}
                    </span>

                    <button
                      onClick={() => handleToggleSuspend(user)}
                      disabled={updatingId === user.id}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all ${
                        user.status === "suspended"
                          ? "border-green-300 text-green-700 hover:bg-green-50"
                          : "border-red-200 text-red-600 hover:bg-red-50"
                      } disabled:opacity-50`}
                    >
                      {updatingId === user.id
                        ? "..."
                        : user.status === "suspended"
                        ? "Reactivate"
                        : "Suspend"}
                    </button>
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
