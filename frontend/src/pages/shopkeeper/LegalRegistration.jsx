import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiShield,
  FiFileText,
  FiUploadCloud,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiExternalLink,
  FiCreditCard,
  FiBriefcase,
} from "react-icons/fi";
import ShopkeeperNavbar from "../../components/ShopkeeperNavbar";
import { useAuth } from "../../context/AuthContext";
import { getShopDetails, submitShopLegal, uploadLegalDocument } from "../../services/legalService";

export default function LegalRegistration() {
  const { user } = useAuth();
  const shopId = user?.shopId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState("");
  const [shop, setShop] = useState(null);

  const [form, setForm] = useState({
    gstin: "",
    legalTradeName: "",
    panNumber: "",
    fssaiNumber: "",
    tradeLicense: "",
    bankDetails: {
      bankName: "",
      accountNumber: "",
      ifsc: "",
      accountHolder: "",
    },
    documents: {
      gstCertificate: "",
      panCard: "",
      fssaiCertificate: "",
      tradeLicenseDoc: "",
      bankProof: "",
    },
    status: "draft",
  });

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    getShopDetails(shopId)
      .then((data) => {
        setShop(data);
        if (data.legal) {
          setForm({
            gstin: data.legal.gstin || "",
            legalTradeName: data.legal.legalTradeName || data.name || "",
            panNumber: data.legal.panNumber || "",
            fssaiNumber: data.legal.fssaiNumber || "",
            tradeLicense: data.legal.tradeLicense || "",
            bankDetails: {
              bankName: data.legal.bankDetails?.bankName || "",
              accountNumber: data.legal.bankDetails?.accountNumber || "",
              ifsc: data.legal.bankDetails?.ifsc || "",
              accountHolder: data.legal.bankDetails?.accountHolder || user?.name || "",
            },
            documents: {
              gstCertificate: data.legal.documents?.gstCertificate || "",
              panCard: data.legal.documents?.panCard || "",
              fssaiCertificate: data.legal.documents?.fssaiCertificate || "",
              tradeLicenseDoc: data.legal.documents?.tradeLicenseDoc || "",
              bankProof: data.legal.documents?.bankProof || "",
            },
            status: data.legal.status || "draft",
          });
        }
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [shopId, user]);

  async function handleFileUpload(e, docKey) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(docKey);
    try {
      const res = await uploadLegalDocument(file);
      setForm((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docKey]: res.url,
        },
      }));
      toast.success(`${file.name} uploaded successfully!`);
    } catch (err) {
      toast.error(err.message || "Document upload failed");
    } finally {
      setUploadingDoc("");
    }
  }

  async function handleSubmit(targetStatus = "submitted") {
    if (!form.gstin.trim()) {
      toast.error("Government Authorized GSTIN is required.");
      return;
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(form.gstin.trim().toUpperCase())) {
      toast.error("Invalid GSTIN format. Example: 07AAAAA0000A1Z5 (15 characters).");
      return;
    }

    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.trim().toUpperCase())) {
      toast.error("Invalid PAN format. Example: ABCDE1234F (10 characters).");
      return;
    }

    if (form.fssaiNumber && !/^\d{14}$/.test(form.fssaiNumber.trim())) {
      toast.error("Invalid FSSAI number. Must be 14 digits.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        gstin: form.gstin.trim().toUpperCase(),
        panNumber: form.panNumber.trim().toUpperCase(),
        fssaiNumber: form.fssaiNumber.trim(),
        status: targetStatus,
      };

      const updatedShop = await submitShopLegal(shopId, payload);
      setShop(updatedShop);
      setForm((prev) => ({ ...prev, status: updatedShop.legal.status }));
      toast.success(
        targetStatus === "submitted"
          ? "Legal registration submitted for Government/Admin verification!"
          : "Draft saved successfully."
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const status = form.status || "draft";

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <ShopkeeperNavbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-gray-900">Legal & Government Registration</h1>
              <span className="bg-brand-100 text-brand-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FiShield /> Official Merchant KYC
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Verify your GSTIN, FSSAI Food License, and legal trade papers to activate your shop on ApnaKirana.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              disabled={submitting}
              className="btn-outline text-xs px-4 py-2"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("submitted")}
              disabled={submitting}
              className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
            >
              <FiCheckCircle size={14} />
              {submitting ? "Submitting..." : "Submit for Verification"}
            </button>
          </div>
        </div>

        {/* Verification Status Banner */}
        {status === "verified" && (
          <div className="card p-4 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
            <FiCheckCircle className="text-emerald-600 text-xl shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Government Authorized & Verified Merchant</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your GSTIN and legal papers are verified. Your shop is officially authorized to accept customer orders.
              </p>
            </div>
          </div>
        )}

        {status === "submitted" && (
          <div className="card p-4 mb-6 bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <FiClock className="text-amber-600 text-xl shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Under Review by Platform Admin</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Your submitted GST and legal documentation are currently undergoing verification. You will be notified once approved.
              </p>
            </div>
          </div>
        )}

        {status === "needs_revision" && (
          <div className="card p-4 mb-6 bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
            <FiAlertTriangle className="text-red-600 text-xl shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Corrections Requested by Admin</h3>
              <p className="text-xs text-red-700 mt-0.5">
                {shop?.legal?.notes || "Please re-upload a clear copy of your GSTIN certificate or correct the license details."}
              </p>
            </div>
          </div>
        )}

        {status === "draft" && (
          <div className="card p-4 mb-6 bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
            <FiFileText className="text-blue-600 text-xl shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Draft Registration</h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Please complete the form below with your official government-issued identifiers and documents to activate your shop.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Section 1: GST & Tax Information */}
          <div className="card p-6 bg-white shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
              <FiBriefcase className="text-brand-600 text-lg" />
              <h2 className="text-lg font-bold text-gray-800">1. Government Authorized GST & Tax Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  GSTIN (Goods and Services Tax ID) <span className="text-red-500">*</span>
                </label>
                <input
                  className="input uppercase font-mono tracking-wider font-semibold"
                  placeholder="07AAAAA0000A1Z5"
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">15-digit state-wise GST identification code.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  Legal Trade / Entity Name
                </label>
                <input
                  className="input"
                  placeholder="As registered in GST certificate"
                  value={form.legalTradeName}
                  onChange={(e) => setForm({ ...form, legalTradeName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  Business / Proprietor PAN Number
                </label>
                <input
                  className="input uppercase font-mono tracking-wider"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={form.panNumber}
                  onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  FSSAI Food License / Registration Number
                </label>
                <input
                  className="input font-mono"
                  placeholder="14-digit FSSAI Number"
                  maxLength={14}
                  value={form.fssaiNumber}
                  onChange={(e) => setForm({ ...form, fssaiNumber: e.target.value.replace(/\D/g, "") })}
                />
                <p className="text-[11px] text-gray-400 mt-1">Mandatory for packaged groceries & edible goods.</p>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  Municipal Trade License / Gumasta / Shop Act No.
                </label>
                <input
                  className="input"
                  placeholder="Local municipal corporation registration reference"
                  value={form.tradeLicense}
                  onChange={(e) => setForm({ ...form, tradeLicense: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Settlement Bank Account */}
          <div className="card p-6 bg-white shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
              <FiCreditCard className="text-brand-600 text-lg" />
              <h2 className="text-lg font-bold text-gray-800">2. Payout & Bank Settlement Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  Beneficiary / Account Holder Name
                </label>
                <input
                  className="input"
                  placeholder="Full name as in bank passbook"
                  value={form.bankDetails.accountHolder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankDetails: { ...form.bankDetails, accountHolder: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  Bank Name
                </label>
                <input
                  className="input"
                  placeholder="e.g. State Bank of India, HDFC"
                  value={form.bankDetails.bankName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankDetails: { ...form.bankDetails, bankName: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  Bank Account Number
                </label>
                <input
                  className="input font-mono"
                  placeholder="Account number"
                  value={form.bankDetails.accountNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankDetails: { ...form.bankDetails, accountNumber: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                  IFSC Code
                </label>
                <input
                  className="input uppercase font-mono tracking-wider"
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  value={form.bankDetails.ifsc}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankDetails: { ...form.bankDetails, ifsc: e.target.value.toUpperCase() },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Section 3: Document Uploads */}
          <div className="card p-6 bg-white shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
              <FiUploadCloud className="text-brand-600 text-lg" />
              <h2 className="text-lg font-bold text-gray-800">3. Legal Document Proofs & Certificates</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Upload clear PDF, PNG, or JPG files (max 10MB each) for fast government and platform approval.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "gstCertificate", label: "GST Registration Certificate", desc: "Form GST REG-06 showing legal address & GSTIN" },
                { key: "panCard", label: "Business / Proprietor PAN Card", desc: "Clear scan of PAN card" },
                { key: "fssaiCertificate", label: "FSSAI License / Registration", desc: "Food safety authority certificate" },
                { key: "tradeLicenseDoc", label: "Trade License / Shop Act Proof", desc: "Municipal certificate or Gumasta" },
                { key: "bankProof", label: "Cancelled Cheque / Bank Passbook", desc: "For verifying IFSC and account number" },
              ].map(({ key, label, desc }) => {
                const uploadedUrl = form.documents[key];
                const isUploading = uploadingDoc === key;

                return (
                  <div key={key} className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                        {uploadedUrl && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FiCheckCircle /> Uploaded
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{desc}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <label className="cursor-pointer btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
                        <FiUploadCloud />
                        {isUploading ? "Uploading..." : uploadedUrl ? "Replace File" : "Choose File"}
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => handleFileUpload(e, key)}
                        />
                      </label>

                      {uploadedUrl && (
                        <a
                          href={uploadedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1 ml-2 font-medium"
                        >
                          <FiExternalLink /> View Document
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Submit Action */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              disabled={submitting}
              className="btn-outline px-6 py-2.5 text-sm"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("submitted")}
              disabled={submitting}
              className="btn-primary px-8 py-2.5 text-sm flex items-center gap-2"
            >
              <FiCheckCircle size={16} />
              {submitting ? "Submitting..." : "Submit All Legal Works for Approval"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
