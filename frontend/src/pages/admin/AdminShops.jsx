import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMapPin,
  FiStar,
  FiPlus,
  FiShield,
  FiCheckCircle,
  FiX,
  FiExternalLink,
  FiCopy,
  FiMail,
  FiPhone,
  FiClock,
  FiAlertTriangle,
  FiSearch,
} from "react-icons/fi";
import AdminNavbar from "../../components/AdminNavbar";
import { SkeletonGrid, SkeletonRow } from "../../components/Skeleton";
import {
  getAllShops,
  updateShopStatus,
  addShopkeeper,
  updateShopLegalStatus,
} from "../../services/adminService";

const FILTERS = ["All", "approved", "pending", "suspended"];

const STATUS_STYLE = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  suspended: "bg-red-100 text-red-700",
};

const LEGAL_BADGE = {
  verified: "bg-emerald-100 text-emerald-800 border-emerald-300",
  submitted: "bg-amber-100 text-amber-800 border-amber-300",
  needs_revision: "bg-red-100 text-red-800 border-red-300",
  draft: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function AdminShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);

  // Invite Shopkeeper Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    shopName: "",
    area: "",
  });

  // Post-Invite Result (Shows generated OTP to Admin)
  const [invitedResult, setInvitedResult] = useState(null);

  // Legal Document Review Modal State
  const [selectedLegalShop, setSelectedLegalShop] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

  function load() {
    setLoading(true);
    getAllShops()
      .then(setShops)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleStatusChange(id, status) {
    setUpdatingId(id);
    try {
      const updated = await updateShopStatus(id, status);
      setShops((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast.success(`Shop ${status}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleInviteShopkeeper(e) {
    e.preventDefault();
    if (!/^\d{10}$/.test(inviteForm.phone)) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }
    if (!inviteForm.email.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }

    setInviteSubmitting(true);
    try {
      const res = await addShopkeeper(inviteForm);
      toast.success("Shopkeeper added! OTP generated and invitation sent.");
      setInvitedResult(res);
      setIsInviteOpen(false);
      setInviteForm({ name: "", email: "", phone: "", shopName: "", area: "" });
      load(); // Refresh list
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleLegalApproval(status) {
    if (!selectedLegalShop) return;
    setReviewing(true);
    try {
      const res = await updateShopLegalStatus(selectedLegalShop.id, status, reviewNotes);
      toast.success(
        status === "verified"
          ? "Government GST & Legal papers approved! Shop is active."
          : `Legal status updated to ${status}.`
      );
      setShops((prev) => prev.map((s) => (s.id === selectedLegalShop.id ? res.shop : s)));
      setSelectedLegalShop(null);
      setReviewNotes("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReviewing(false);
    }
  }

  function copyToClipboard(text, label = "Text") {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  }

  const [search, setSearch] = useState("");
  const filtered = shops
    .filter((s) => (filter === "All" ? true : s.status === filter))
    .filter((s) => {
      const q = search.toLowerCase();
      return (
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.area || "").toLowerCase().includes(q) ||
        (s.legal?.gstin || "").toLowerCase().includes(q)
      );
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors pb-16">
      <AdminNavbar />

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white px-4 sm:px-8 py-8 shadow-lg">
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-purple-200 text-xs font-bold uppercase tracking-wider mb-1 block">
              Merchant Verification
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              Shops &amp; Legal Registration
            </h1>
            <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
              Verify 15-digit GSTIN, FSSAI certificates, and invite new merchants
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 bg-white text-purple-900 font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-lg hover:bg-purple-50 transition-all self-start sm:self-auto shrink-0"
          >
            <FiPlus size={16} /> Add / Invite Shopkeeper
          </motion.button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-3 pt-6">
        {/* Search */}
        <div className="card p-3 mb-4 flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
          <FiSearch className="text-gray-400 shrink-0" size={16} />
          <input
            className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 font-medium"
            placeholder="Search shops by name, area, or GSTIN number..."
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

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-2xl text-xs font-bold capitalize whitespace-nowrap transition-all duration-200 shadow-xs ${
                filter === f
                  ? "bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none scale-105"
                  : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonGrid count={4} Component={SkeletonRow} className="space-y-3" />
        ) : (
          <motion.div layout className="space-y-3.5">
            <AnimatePresence>
              {filtered.map((shop, i) => {
                const legalStatus = shop.legal?.status || "none";

                return (
                  <motion.div
                    key={shop.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    className={`card p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      updatingId === shop.id ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-2xl shrink-0 p-2.5 shadow-inner">
                        🏪
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-extrabold text-gray-900 dark:text-white truncate text-base">
                            {shop.name}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[shop.status]}`}
                          >
                            {shop.status}
                          </span>

                          {/* Government GST Legal Badge */}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${
                              LEGAL_BADGE[legalStatus] || "bg-gray-50 text-gray-500 border-gray-200"
                            }`}
                          >
                            <FiShield size={10} />
                            {legalStatus === "verified"
                              ? "GST & FSSAI Verified"
                              : legalStatus === "submitted"
                              ? "GST Review Pending"
                              : legalStatus === "needs_revision"
                              ? "GST Revision Needed"
                              : "GST Draft"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <FiMapPin size={12} className="text-purple-500" /> {shop.area || "No area specified"}
                        </p>

                        {shop.legal?.gstin && (
                          <p className="text-[11px] text-gray-500 font-mono mt-1">
                            GSTIN: <span className="font-bold text-gray-700 dark:text-gray-300">{shop.legal.gstin}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => {
                          setSelectedLegalShop(shop);
                          setReviewNotes(shop.legal?.notes || "");
                        }}
                        className="btn-outline text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 font-bold"
                      >
                        <FiShield size={13} /> Inspect Legal &amp; GST
                      </button>

                      {shop.status !== "approved" && (
                        <button
                          onClick={() => handleStatusChange(shop.id, "approved")}
                          className="btn-primary text-xs px-3.5 py-2 rounded-xl font-bold"
                        >
                          Approve
                        </button>
                      )}

                      {shop.status !== "suspended" && (
                        <button
                          onClick={() => handleStatusChange(shop.id, "suspended")}
                          className="btn-outline text-xs px-3.5 py-2 rounded-xl !text-red-600 !border-red-200 hover:!bg-red-50 font-bold"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="card p-12 text-center my-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl">
                <p className="text-gray-500 text-sm">No shops found matching the criteria.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* MODAL 1: Add / Invite Shopkeeper */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏪</span>
                <h3 className="font-bold text-gray-900">Add & Invite Shopkeeper</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Enter the shopkeeper's Gmail and shop details. An official invitation with login OTP will be sent to their email, and the OTP will be displayed for you immediately.
            </p>

            <form onSubmit={handleInviteShopkeeper} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Owner Full Name</label>
                <input
                  className="input"
                  placeholder="e.g. Ramesh Gupta"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Shopkeeper Gmail / Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="e.g. ramesh.kirana@gmail.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Mobile Phone Number</label>
                <input
                  className="input"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={inviteForm.phone}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, phone: e.target.value.replace(/\D/g, "") })
                  }
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Shop Name</label>
                <input
                  className="input"
                  placeholder="e.g. Gupta Daily Mart"
                  value={inviteForm.shopName}
                  onChange={(e) => setInviteForm({ ...inviteForm, shopName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Area / Location</label>
                <input
                  className="input"
                  placeholder="e.g. Sector 18, Noida"
                  value={inviteForm.area}
                  onChange={(e) => setInviteForm({ ...inviteForm, area: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  <FiMail />
                  {inviteSubmitting ? "Inviting & Generating OTP..." : "Add & Generate OTP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Post-Invite OTP Display (Shows OTP directly to Admin) */}
      {invitedResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-brand-500 animate-in fade-in">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl mb-2">
                ✓
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Shopkeeper Added Successfully!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Invitation sent to <strong>{invitedResult.shopkeeper?.email}</strong>
              </p>
            </div>

            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center my-4">
              <p className="text-xs font-semibold text-brand-800 uppercase tracking-wider mb-1">
                Shopkeeper Direct Access OTP
              </p>
              <div className="text-3xl font-extrabold font-mono tracking-widest text-brand-700 py-1">
                {invitedResult.otp}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                The shopkeeper can directly enter this OTP on the login page using their email to access the portal.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
              <p><strong>Shop:</strong> {invitedResult.shop?.name}</p>
              <p><strong>Owner:</strong> {invitedResult.shopkeeper?.name}</p>
              <p><strong>Email:</strong> {invitedResult.shopkeeper?.email}</p>
              <p><strong>Phone:</strong> {invitedResult.shopkeeper?.phone}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    `Hello ${invitedResult.shopkeeper?.name}, your ApnaKirana shopkeeper account for "${invitedResult.shop?.name}" has been created! Login at http://localhost:5173/login with your email (${invitedResult.shopkeeper?.email}) and OTP: ${invitedResult.otp} to complete your GST & legal registration.`,
                    "Login Credentials & OTP"
                  )
                }
                className="btn-outline flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <FiCopy /> Copy Details
              </button>
              <button
                onClick={() => setInvitedResult(null)}
                className="btn-primary flex-1 text-xs py-2"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Legal & GST Inspection */}
      {selectedLegalShop && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FiShield className="text-brand-600 text-xl" />
                <h3 className="font-bold text-gray-900">
                  Legal & Government GST Review: {selectedLegalShop.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLegalShop(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Current Legal Info */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400 block font-semibold">Government Authorized GSTIN</span>
                  <span className="font-mono text-sm font-bold text-gray-900">
                    {selectedLegalShop.legal?.gstin || "Not provided"}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block font-semibold">Legal Trade Name</span>
                  <span className="font-medium text-gray-800">
                    {selectedLegalShop.legal?.legalTradeName || selectedLegalShop.name}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block font-semibold">PAN Number</span>
                  <span className="font-mono font-medium text-gray-800">
                    {selectedLegalShop.legal?.panNumber || "Not provided"}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block font-semibold">FSSAI Food License</span>
                  <span className="font-mono font-medium text-gray-800">
                    {selectedLegalShop.legal?.fssaiNumber || "Not provided"}
                  </span>
                </div>

                <div className="md:col-span-2">
                  <span className="text-gray-400 block font-semibold">Municipal Trade License</span>
                  <span className="font-medium text-gray-800">
                    {selectedLegalShop.legal?.tradeLicense || "Not provided"}
                  </span>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-800 mb-2">Settlement Bank Account</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <p><strong>Bank:</strong> {selectedLegalShop.legal?.bankDetails?.bankName || "-"}</p>
                  <p><strong>Account Holder:</strong> {selectedLegalShop.legal?.bankDetails?.accountHolder || "-"}</p>
                  <p><strong>A/C Number:</strong> {selectedLegalShop.legal?.bankDetails?.accountNumber || "-"}</p>
                  <p><strong>IFSC:</strong> {selectedLegalShop.legal?.bankDetails?.ifsc || "-"}</p>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Uploaded Document Copies</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: "gstCertificate", label: "GST Certificate" },
                    { key: "panCard", label: "PAN Card" },
                    { key: "fssaiCertificate", label: "FSSAI License" },
                    { key: "tradeLicenseDoc", label: "Trade License" },
                    { key: "bankProof", label: "Bank Proof" },
                  ].map(({ key, label }) => {
                    const docUrl = selectedLegalShop.legal?.documents?.[key];
                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-lg border border-gray-200 bg-white flex items-center justify-between"
                      >
                        <span className="text-gray-700">{label}</span>
                        {docUrl ? (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-600 hover:text-brand-800 flex items-center gap-1 font-semibold"
                          >
                            <FiExternalLink /> View
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Not uploaded</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin Feedback Notes */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Verification Notes / Feedback for Shopkeeper
                </label>
                <textarea
                  className="input min-h-[70px]"
                  placeholder="Add optional notes (e.g. Please upload a clearer copy of GST certificate)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-gray-100 mt-4">
              <button
                type="button"
                onClick={() => setSelectedLegalShop(null)}
                className="btn-outline text-xs px-3 py-2"
              >
                Close
              </button>

              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleLegalApproval("needs_revision")}
                className="btn-outline text-xs px-3 py-2 !text-amber-700 !border-amber-300 hover:!bg-amber-50"
              >
                Request Revision
              </button>

              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleLegalApproval("verified")}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <FiCheckCircle size={14} />
                {reviewing ? "Processing..." : "Verify & Approve GST"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
