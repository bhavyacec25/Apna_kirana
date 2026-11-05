import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPhone,
  FiMail,
  FiUser,
  FiShield,
  FiCheckCircle,
  FiSearch,
  FiPlus,
  FiX,
  FiTrash2,
  FiAlertTriangle,
  FiLock,
  FiUserPlus,
} from "react-icons/fi";
import AdminNavbar from "../../components/AdminNavbar";
import { SkeletonGrid, SkeletonRow } from "../../components/Skeleton";
import {
  getAllUsers,
  updateUserStatus,
  getAdminMembers,
  addAdminMember,
  revokeAdminMember,
} from "../../services/adminService";
import { useAuth } from "../../context/AuthContext";

const ROLE_FILTERS = ["All", "customer", "shopkeeper"];

const DESIGNATION_OPTIONS = [
  "Operations Admin",
  "Regional Operations Lead",
  "Catalog & Inventory Lead",
  "Dispute & Compliance Lead",
  "Co-Administrator",
];

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view: 'admins' | 'users'
  const initialTab = searchParams.get("tab") === "admins" ? "admins" : "admins";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Platform users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roleFilter, setRoleFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  // Admin team state
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Add Admin modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(searchParams.get("openAdd") === "true");
  const [adminForm, setAdminForm] = useState({
    name: "",
    phone: "",
    email: "",
    designation: "Operations Admin",
  });
  const [submittingAdmin, setSubmittingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Revoke confirmation modal state
  const [adminToRevoke, setAdminToRevoke] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  function loadUsers() {
    setLoadingUsers(true);
    getAllUsers()
      .then(setUsers)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingUsers(false));
  }

  function loadAdmins() {
    setLoadingAdmins(true);
    getAdminMembers()
      .then(setAdmins)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingAdmins(false));
  }

  useEffect(() => {
    loadUsers();
    loadAdmins();
  }, []);

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

  async function handleAddAdminSubmit(e) {
    e.preventDefault();
    setAdminError("");

    if (!adminForm.name.trim()) {
      setAdminError("Please enter the administrator's full name.");
      return;
    }

    const cleanPhone = adminForm.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setAdminError("Please enter a valid 10-digit Indian WhatsApp mobile number.");
      return;
    }

    if (adminForm.email && !/^\S+@\S+\.\S+$/.test(adminForm.email.trim())) {
      setAdminError("Please enter a valid email address.");
      return;
    }

    setSubmittingAdmin(true);
    try {
      const res = await addAdminMember({
        name: adminForm.name.trim(),
        phone: cleanPhone,
        email: adminForm.email.trim(),
        designation: adminForm.designation,
      });

      toast.success(`Administrator ${adminForm.name} successfully authorized! 🛡️`, {
        duration: 5000,
      });

      setIsAddModalOpen(false);
      setAdminForm({
        name: "",
        phone: "",
        email: "",
        designation: "Operations Admin",
      });

      // Reload both lists
      loadAdmins();
      loadUsers();
    } catch (err) {
      setAdminError(err.message);
      toast.error(err.message);
    } finally {
      setSubmittingAdmin(false);
    }
  }

  async function handleConfirmRevoke() {
    if (!adminToRevoke) return;
    setRevokingId(adminToRevoke.id);
    try {
      await revokeAdminMember(adminToRevoke.id);
      toast.success(`Revoked administrator access for ${adminToRevoke.name}.`);
      setAdminToRevoke(null);
      loadAdmins();
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRevokingId(null);
    }
  }

  const filteredUsers = users
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

  const masterAdminCount = admins.filter(
    (a) => a.phone === "8283833894" || a.email?.toLowerCase() === "chhajerbhavya30@gmail.com"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <AdminNavbar />

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white px-4 sm:px-8 py-9 shadow-xl">
        <div className="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="max-w-5xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-purple-200 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Executive Access &amp; Governance
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-display text-white">
              Team &amp; Platform Accounts
            </h1>
            <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-xl">
              Scale up your administrative team, distribute operational duties, and manage registered shopper and store owner accounts.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => {
                setAdminError("");
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <FiUserPlus size={16} /> + Add Admin Member
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-4 pt-6">
        {/* Navigation Tabs (Admin Team vs Platform Users) */}
        <div className="flex p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm mb-6 max-w-md">
          <button
            onClick={() => {
              setActiveTab("admins");
              setSearchParams({ tab: "admins" });
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "admins"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FiShield size={14} /> Admin Team ({admins.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("users");
              setSearchParams({ tab: "users" });
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "users"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <FiUser size={14} /> Platform Users ({users.filter((u) => u.role !== "admin").length})
          </button>
        </div>

        {/* ═════════════════ TAB 1: ADMIN TEAM & SCALE-UP ═════════════════ */}
        {activeTab === "admins" && (
          <div className="space-y-6">
            {/* Scale-up Information Callout */}
            <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 text-white border border-indigo-700/50 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="pointer-events-none absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <h3 className="text-base font-extrabold text-white">
                      Operations Team Scaling
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl">
                    Administrators have elevated security clearance to verify merchant GST papers, audit live orders, inspect payments, and manage platform catalogs. Adding an admin instantly whitelists their mobile number for WhatsApp OTP login at{" "}
                    <code className="text-emerald-300 font-mono text-[11px] bg-black/30 px-1.5 py-0.5 rounded">/admin/login</code>.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setAdminError("");
                    setIsAddModalOpen(true);
                  }}
                  className="bg-white text-indigo-900 font-black text-xs px-4 py-2.5 rounded-xl shadow-md hover:bg-indigo-50 transition shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                >
                  <FiPlus size={14} /> Authorize New Admin
                </button>
              </div>

              {/* Security Metrics Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-indigo-700/40 text-xs">
                <div className="bg-black/20 rounded-xl p-2.5">
                  <span className="text-[10px] text-indigo-300 uppercase font-bold block">
                    Master Admin
                  </span>
                  <span className="font-extrabold text-white">Bhavya Chhajer</span>
                </div>
                <div className="bg-black/20 rounded-xl p-2.5">
                  <span className="text-[10px] text-indigo-300 uppercase font-bold block">
                    Active Clearance
                  </span>
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                    <FiCheckCircle size={12} /> {admins.length} Total Admins
                  </span>
                </div>
                <div className="bg-black/20 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-indigo-300 uppercase font-bold block">
                    Security Gateway
                  </span>
                  <span className="font-extrabold text-teal-300">WhatsApp OTP &amp; TLS 1.3</span>
                </div>
              </div>
            </div>

            {/* Admin Cards Grid */}
            {loadingAdmins ? (
              <SkeletonGrid count={3} Component={SkeletonRow} className="space-y-3" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admins.map((admin) => {
                  const isMaster =
                    admin.phone === "8283833894" ||
                    admin.email?.toLowerCase() === "chhajerbhavya30@gmail.com";
                  const isCurrent = currentUser?.id === admin.id;

                  return (
                    <motion.div
                      key={admin.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`card p-5 rounded-3xl border transition-all relative overflow-hidden ${
                        isMaster
                          ? "bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-white dark:to-gray-900 border-amber-300/60 dark:border-amber-500/30 shadow-md shadow-amber-500/5"
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md"
                      }`}
                    >
                      {/* Master Admin Ribbon */}
                      {isMaster && (
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-bl-2xl shadow-sm flex items-center gap-1">
                          <span>👑</span> Master Admin
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <div
                          className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md shrink-0 ${
                            isMaster
                              ? "bg-gradient-to-br from-amber-500 to-orange-600"
                              : "bg-gradient-to-br from-indigo-600 to-purple-600"
                          }`}
                        >
                          {isMaster ? "👑" : admin.name ? admin.name[0].toUpperCase() : "A"}
                        </div>

                        <div className="flex-1 min-w-0 pr-12">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                              {admin.name}
                            </h4>
                            {isCurrent && (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                isMaster
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                              }`}
                            >
                              <FiShield size={11} /> {admin.designation || (isMaster ? "Root Platform Administrator" : "Operations Admin")}
                            </span>
                          </div>

                          {/* Contact details */}
                          <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                            {admin.phone && (
                              <p className="flex items-center gap-1.5 font-medium">
                                <span className="text-emerald-500">💬</span>
                                <span className="font-mono text-gray-800 dark:text-gray-200 font-bold">
                                  +91 {admin.phone}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded">
                                  WhatsApp Active
                                </span>
                              </p>
                            )}
                            {admin.email && (
                              <p className="flex items-center gap-1.5">
                                <FiMail size={12} className="text-gray-400" />
                                <span className="truncate">{admin.email}</span>
                              </p>
                            )}
                          </div>

                          {/* Meta */}
                          <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <span>Status: <b className="text-emerald-600">Active Clearance</b></span>
                            <span>ID: {admin.id}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="text-[11px] text-gray-400">
                          {isMaster ? (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <FiLock size={12} /> Root Security Clearance
                            </span>
                          ) : (
                            <span className="text-gray-500">Added by Master Admin</span>
                          )}
                        </div>

                        {!isMaster && (
                          <button
                            onClick={() => setAdminToRevoke(admin)}
                            disabled={isCurrent}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 transition disabled:opacity-40"
                          >
                            <FiTrash2 size={12} /> Revoke Clearance
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════ TAB 2: PLATFORM USERS (CUSTOMERS & SHOPKEEPERS) ═════════════════ */}
        {activeTab === "users" && (
          <div>
            {/* Search */}
            <div className="card p-3 mb-4 flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
              <FiSearch className="text-gray-400 shrink-0" size={16} />
              <input
                className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 font-medium"
                placeholder="Search customers & shopkeepers by name, phone, email, or shop name..."
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
                  {f === "All" ? "All Platform Users" : `${f}s`}
                </button>
              ))}
            </div>

            {loadingUsers ? (
              <SkeletonGrid count={5} Component={SkeletonRow} className="space-y-3" />
            ) : (
              <motion.div layout className="space-y-3">
                <AnimatePresence>
                  {filteredUsers.map((user, i) => (
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
                              <span className="flex items-center gap-1 font-mono">
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
        )}
      </div>

      {/* ═════════════════ MODAL: ADD / AUTHORIZE ADMIN MEMBER ═════════════════ */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden relative"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-6 relative">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  <FiX size={16} />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl mb-3 shadow-md">
                  🛡️
                </div>
                <h3 className="text-xl font-black">Authorize Administrator</h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  Grant executive platform management privileges to a new team member.
                </p>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddAdminSubmit} className="p-6 space-y-4">
                {/* Security Protocol Notice */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs rounded-2xl p-3.5 flex items-start gap-2.5">
                  <FiCheckCircle className="text-emerald-600 shrink-0 text-base mt-0.5" />
                  <p className="leading-relaxed">
                    <b>Instant Whitelist:</b> Once added, this mobile number is granted administrative clearance. They can log in immediately at <b className="text-emerald-700 dark:text-emerald-300">/admin/login</b> using WhatsApp OTP.
                  </p>
                </div>

                {/* Error Banner */}
                {adminError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-start gap-2">
                    <FiAlertTriangle className="shrink-0 text-sm mt-0.5" />
                    <span>{adminError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block mb-1">
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aman Gupta"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-purple-600 focus:bg-white dark:focus:bg-gray-900 transition"
                  />
                </div>

                {/* WhatsApp Mobile */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block">
                      WhatsApp Mobile Number *
                    </label>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      💬 WhatsApp OTP Login
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 shrink-0">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={adminForm.phone}
                      onChange={(e) =>
                        setAdminForm({ ...adminForm, phone: e.target.value.replace(/\D/g, "") })
                      }
                      className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-gray-900 dark:text-white outline-none focus:border-purple-600 focus:bg-white dark:focus:bg-gray-900 transition"
                    />
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block mb-1">
                    Official Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. aman.ops@apnakirana.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-purple-600 focus:bg-white dark:focus:bg-gray-900 transition"
                  />
                </div>

                {/* Designation / Role */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 block mb-1">
                    Administrative Designation / Role
                  </label>
                  <select
                    value={adminForm.designation}
                    onChange={(e) => setAdminForm({ ...adminForm, designation: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-purple-600 transition"
                  >
                    {DESIGNATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdmin}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {submittingAdmin ? (
                      <span>Authorizing...</span>
                    ) : (
                      <>
                        <FiCheckCircle size={14} /> Authorize &amp; Save Admin
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═════════════════ MODAL: REVOKE CLEARANCE CONFIRMATION ═════════════════ */}
      <AnimatePresence>
        {adminToRevoke && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl mb-4">
                <FiAlertTriangle />
              </div>

              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Revoke Admin Privileges?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Are you sure you want to revoke administrative access for{" "}
                <b className="text-gray-800 dark:text-gray-200">{adminToRevoke.name}</b> (+91 {adminToRevoke.phone})?
                They will no longer be able to access the executive admin portal or review platform data.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdminToRevoke(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={revokingId === adminToRevoke.id}
                  onClick={handleConfirmRevoke}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md transition disabled:opacity-50"
                >
                  {revokingId === adminToRevoke.id ? "Revoking..." : "Revoke Clearance"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
