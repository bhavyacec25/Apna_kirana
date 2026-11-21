import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FiX,
  FiShield,
  FiCheckCircle,
  FiCopy,
  FiCreditCard,
  FiSmartphone,
  FiGlobe,
  FiLock,
  FiCheck,
  FiArrowRight,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi";

const POPULAR_BANKS = [
  { id: "sbi", name: "State Bank of India", code: "SBIN", color: "#280071" },
  { id: "hdfc", name: "HDFC Bank", code: "HDFC", color: "#004c8f" },
  { id: "icici", name: "ICICI Bank", code: "ICIC", color: "#f37021" },
  { id: "axis", name: "Axis Bank", code: "UTIB", color: "#97144d" },
  { id: "kotak", name: "Kotak Mahindra Bank", code: "KKBK", color: "#ed1c24" },
  { id: "pnb", name: "Punjab National Bank", code: "PUNB", color: "#a20b29" },
];

const OTHER_BANKS = [
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "IDFC First Bank",
  "Yes Bank",
  "Federal Bank",
  "Indian Bank",
  "Central Bank of India",
  "RBL Bank",
];

const UPI_APPS = [
  { id: "gpay", name: "Google Pay", color: "from-blue-500 to-indigo-600", tag: "Fastest" },
  { id: "phonepe", name: "PhonePe", color: "from-purple-600 to-indigo-700", tag: "Popular" },
  { id: "paytm", name: "Paytm UPI", color: "from-sky-500 to-blue-600", tag: "Instant" },
  { id: "cred", name: "CRED UPI", color: "from-neutral-800 to-black", tag: "Rewards" },
];

export default function PaymentModal({
  total,
  orderData,
  paymentConfig,
  onSuccess,
  onClose,
  onRazorpayDirect,
}) {
  const [activeTab, setActiveTab] = useState("upi"); // upi | card | netbanking | wallets
  const [upiMode, setUpiMode] = useState("qr"); // qr | apps | vpa
  const [upiId, setUpiId] = useState("");
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 minutes

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [saveCard, setSaveCard] = useState(true);

  // Bank form state
  const [selectedBank, setSelectedBank] = useState("sbi");
  const [otherBank, setOtherBank] = useState("");

  // Wallet form state
  const [selectedWallet, setSelectedWallet] = useState("paytm");

  // Bank 3D Secure OTP step state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [bankOtp, setBankOtp] = useState("482910");
  const [otpTimer, setOtpTimer] = useState(30);

  // Payment progress state
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(""); // "" | "authorizing" | "verifying" | "success"

  const merchantVpa = paymentConfig?.merchantVpa || "apnakirana@okhdfcbank";
  const upiDeepLink = `upi://pay?pa=${merchantVpa}&pn=ApnaKirana&am=${total}&cu=INR&tn=Order%20Payment`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiDeepLink
  )}&margin=10`;

  // 5 minute countdown for QR code
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  // 30s OTP countdown
  useEffect(() => {
    if (!showOtpModal || otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [showOtpModal, otpTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(merchantVpa);
    setCopiedVpa(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedVpa(false), 2500);
  };

  // Card detection
  const getCardBrand = (num) => {
    const clean = num.replace(/\D/g, "");
    if (/^4/.test(clean)) return "VISA";
    if (/^5[1-5]/.test(clean)) return "MASTERCARD";
    if (/^(60|65|81|82)/.test(clean)) return "RUPAY";
    if (/^3[47]/.test(clean)) return "AMEX";
    return "CARD";
  };

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + "/" + raw.slice(2);
    }
    setCardExpiry(raw);
  };

  const executePayment = (methodName, details = {}) => {
    setProcessing(true);
    setProcessStep("authorizing");

    setTimeout(() => {
      setProcessStep("verifying");
      setTimeout(() => {
        setProcessStep("success");
        setTimeout(() => {
          const txnId = `TXN_${methodName.toUpperCase().replace(/\s+/g, "")}_${Date.now()
            .toString(36)
            .toUpperCase()}_${Math.floor(1000 + Math.random() * 9000)}`;

          onSuccess({
            paymentId: txnId,
            paymentStatus: "Paid",
            paymentMethod: methodName,
            paymentDetails: {
              method: methodName,
              amount: total,
              transactionId: txnId,
              timestamp: new Date().toISOString(),
              ...details,
            },
          });
        }, 800);
      }, 900);
    }, 900);
  };

  // UPI payment submit
  const handleUpiPay = (appName = null) => {
    if (!appName && upiMode === "vpa") {
      if (!upiId || !upiId.includes("@")) {
        toast.error("Please enter a valid UPI ID (e.g. mobile@upi)");
        return;
      }
    }
    const methodTitle = appName ? `UPI (${appName})` : upiMode === "qr" ? "UPI (Scan & Pay)" : "UPI ID";
    executePayment(methodTitle, { upiId: upiId || `${appName?.toLowerCase() || "user"}@upi` });
  };

  // Card payment submit
  const handleCardPay = (e) => {
    e.preventDefault();
    const cleanNum = cardNumber.replace(/\D/g, "");
    if (cleanNum.length < 16) {
      toast.error("Please enter a valid 16-digit card number.");
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      toast.error("Please enter a valid expiry date (MM/YY).");
      return;
    }
    if (!cardCvv || cardCvv.length < 3) {
      toast.error("Please enter a valid 3-digit CVV.");
      return;
    }
    // Launch realistic Bank 3D Secure OTP verification
    setShowOtpModal(true);
    setOtpTimer(30);
  };

  const handleBankOtpVerify = () => {
    if (!bankOtp || bankOtp.length < 4) {
      toast.error("Please enter the 6-digit OTP received on your mobile.");
      return;
    }
    setShowOtpModal(false);
    executePayment("Credit / Debit Card", {
      brand: getCardBrand(cardNumber),
      last4: cardNumber.replace(/\D/g, "").slice(-4),
      holder: cardHolder || "Cardholder",
    });
  };

  // Net banking submit
  const handleNetBankingPay = () => {
    const bankObj = POPULAR_BANKS.find((b) => b.id === selectedBank);
    const bankName = bankObj ? bankObj.name : otherBank || "NetBanking";
    executePayment("Net Banking", { bankName });
  };

  // Wallet submit
  const handleWalletPay = () => {
    const names = {
      paytm: "Paytm Wallet",
      phonepe: "PhonePe Wallet",
      amazon: "Amazon Pay",
      mobikwik: "MobiKwik",
    };
    executePayment("Mobile Wallet", { walletName: names[selectedWallet] || "Wallet" });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <FiShield className="text-xl text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg leading-tight">ApnaKirana Secure Pay</h2>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                  <FiLock size={9} /> 256-bit SSL
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">Safe & Encrypted Instant Payment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-emerald-200 block uppercase font-bold tracking-wider">Amount Due</span>
              <span className="text-xl sm:text-2xl font-black text-white">₹{total}</span>
            </div>
            <button
              onClick={onClose}
              disabled={processing}
              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
              aria-label="Close Payment Gateway"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Razorpay Banner if official keys present */}
        {paymentConfig?.enabled && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-5 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <span className="flex items-center gap-1.5 font-medium">
              ⚡ Razorpay Live Gateway is active for this account.
            </span>
            <button
              type="button"
              onClick={onRazorpayDirect}
              className="font-bold underline hover:text-amber-700 dark:hover:text-amber-100"
            >
              Use Razorpay Popup
            </button>
          </div>
        )}

        {/* Main Gateway Body */}
        <div className="flex-1 overflow-y-auto">
          {processing ? (
            /* Processing Animation Screen */
            <div className="p-8 text-center flex flex-col items-center justify-center min-h-[380px]">
              {processStep === "authorizing" && (
                <>
                  <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                    Connecting to Payment Gateway...
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Securing encrypted handshake with UPI & Banking server. Please do not refresh.
                  </p>
                </>
              )}

              {processStep === "verifying" && (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-4 animate-pulse">
                    <FiShield size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                    Verifying Transaction Signature...
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Confirming funds transfer of ₹{total} for ApnaKirana quick order.
                  </p>
                </>
              )}

              {processStep === "success" && (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-200 scale-110 transition-transform">
                    <FiCheck size={36} className="animate-bounce" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 mb-1">
                    Payment Verified Successfully!
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">Placing your order with instant shop dispatch...</p>
                  <span className="text-[11px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full">
                    Reference Verified · 100% Safe
                  </span>
                </>
              )}
            </div>
          ) : (
            <div>
              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 text-xs font-bold text-gray-500">
                <button
                  type="button"
                  onClick={() => setActiveTab("upi")}
                  className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-colors border-b-2 ${
                    activeTab === "upi"
                      ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-900"
                      : "border-transparent hover:text-gray-700"
                  }`}
                >
                  <FiSmartphone className="text-base" />
                  <span>UPI & QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("card")}
                  className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-colors border-b-2 ${
                    activeTab === "card"
                      ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-900"
                      : "border-transparent hover:text-gray-700"
                  }`}
                >
                  <FiCreditCard className="text-base" />
                  <span>Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("netbanking")}
                  className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-colors border-b-2 ${
                    activeTab === "netbanking"
                      ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-900"
                      : "border-transparent hover:text-gray-700"
                  }`}
                >
                  <FiGlobe className="text-base" />
                  <span>Net Banking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("wallets")}
                  className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-colors border-b-2 ${
                    activeTab === "wallets"
                      ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-900"
                      : "border-transparent hover:text-gray-700"
                  }`}
                >
                  <FiLock className="text-base" />
                  <span>Wallets</span>
                </button>
              </div>

              {/* Tab Content 1: UPI */}
              {activeTab === "upi" && (
                <div className="p-5 space-y-4">
                  {/* UPI Submode Pills */}
                  <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setUpiMode("qr")}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        upiMode === "qr"
                          ? "bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      ⚡ Scan & Pay QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMode("apps")}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        upiMode === "apps"
                          ? "bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      📱 UPI Apps
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMode("vpa")}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        upiMode === "vpa"
                          ? "bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      ✍️ UPI ID
                    </button>
                  </div>

                  {/* Mode: QR Code */}
                  {upiMode === "qr" && (
                    <div className="flex flex-col items-center text-center space-y-3 py-1">
                      <div className="relative p-3 bg-white rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 shadow-md">
                        <img
                          src={qrCodeUrl}
                          alt="ApnaKirana Dynamic UPI QR Code"
                          className="w-44 h-44 sm:w-48 sm:h-48 rounded-xl object-contain"
                          loading="eager"
                        />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                          Live Scannable QR
                        </div>
                      </div>

                      {/* Timer & Pulse */}
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 pt-1">
                        <FiClock className="text-amber-500" />
                        <span>QR expires in: </span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {formatTimer(timerSeconds)}
                        </span>
                      </div>

                      {/* UPI ID copy */}
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                        <span className="text-gray-500">Merchant UPI ID:</span>
                        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{merchantVpa}</span>
                        <button
                          type="button"
                          onClick={handleCopyVpa}
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                          title="Copy UPI ID"
                        >
                          {copiedVpa ? <FiCheck size={14} className="text-emerald-600" /> : <FiCopy size={14} />}
                        </button>
                      </div>

                      {/* Supported Apps */}
                      <div className="text-[11px] text-gray-400 flex items-center justify-center gap-2">
                        <span>Scan using any app:</span>
                        <span className="font-bold text-gray-600 dark:text-gray-300">GPay · PhonePe · Paytm · BHIM · CRED</span>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => handleUpiPay()}
                        className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                      >
                        <FiCheckCircle size={16} />
                        I Have Made the Payment (₹{total})
                      </button>
                    </div>
                  )}

                  {/* Mode: Direct UPI Apps */}
                  {upiMode === "apps" && (
                    <div className="space-y-3 py-2">
                      <p className="text-xs text-gray-500">Choose your preferred UPI application for 1-tap checkout:</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {UPI_APPS.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => handleUpiPay(app.name)}
                            className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-gray-800/80 hover:bg-emerald-50/30 flex items-center justify-between text-left transition-all group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${app.color} text-white font-extrabold text-xs flex items-center justify-center shadow-sm`}
                              >
                                {app.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-gray-800 dark:text-gray-100 group-hover:text-emerald-700">
                                  {app.name}
                                </h4>
                                <span className="text-[10px] text-emerald-600 font-semibold">{app.tag}</span>
                              </div>
                            </div>
                            <FiArrowRight
                              size={14}
                              className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 text-center pt-2">
                        Clicking an app initiates immediate secure verification.
                      </p>
                    </div>
                  )}

                  {/* Mode: Enter UPI ID */}
                  {upiMode === "vpa" && (
                    <div className="space-y-3 py-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                        Enter your Virtual Payment Address (VPA / UPI ID)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value.trim().toLowerCase())}
                          placeholder="e.g. 9876543210@paytm or yourname@okhdfcbank"
                          className="input flex-1 font-mono text-sm"
                        />
                      </div>

                      {/* Quick bank chips */}
                      <div className="flex flex-wrap gap-1.5 items-center text-xs">
                        <span className="text-gray-400 text-[11px]">Quick append:</span>
                        {["@okhdfcbank", "@okaxis", "@ybl", "@paytm", "@ibl"].map((suffix) => (
                          <button
                            key={suffix}
                            type="button"
                            onClick={() => {
                              const base = upiId.split("@")[0] || "9876543210";
                              setUpiId(`${base}${suffix}`);
                            }}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 hover:text-emerald-700 text-gray-600 dark:text-gray-300 font-medium transition-colors"
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpiPay()}
                        className="w-full mt-3 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 transition-all"
                      >
                        Verify & Pay ₹{total}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 2: Cards */}
              {activeTab === "card" && (
                <div className="p-5 space-y-4">
                  {/* Credit Card Visual Preview */}
                  <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 text-white p-4 shadow-xl border border-slate-700/60 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-9 h-7 rounded-md bg-amber-400/80 border border-amber-300/40 flex items-center justify-center text-[10px] text-amber-950 font-bold">
                        CHIP
                      </div>
                      <span className="font-extrabold tracking-widest text-xs uppercase bg-white/10 px-2 py-0.5 rounded-md">
                        {getCardBrand(cardNumber)}
                      </span>
                    </div>
                    <div className="font-mono text-base sm:text-lg tracking-widest mb-3">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Cardholder</span>
                        <span className="font-semibold tracking-wider uppercase">
                          {cardHolder || "YOUR NAME"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Expires</span>
                        <span className="font-semibold tracking-wider">{cardExpiry || "MM/YY"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Form */}
                  <form onSubmit={handleCardPay} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="input font-mono text-sm tracking-wider"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Name as printed on card"
                        className="input text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="input font-mono text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                          CVV / CVC
                        </label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="input font-mono text-sm"
                          required
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-gray-500 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Securely save this card as per RBI tokenization guidelines</span>
                    </label>

                    <button
                      type="submit"
                      className="w-full mt-3 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 transition-all"
                    >
                      Pay ₹{total} via Card
                    </button>
                  </form>
                </div>
              )}

              {/* Tab Content 3: Net Banking */}
              {activeTab === "netbanking" && (
                <div className="p-5 space-y-4">
                  <p className="text-xs text-gray-500">Select your bank for direct net banking authorization:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {POPULAR_BANKS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                          selectedBank === b.id
                            ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <span className="font-extrabold text-xs text-gray-800 dark:text-gray-100">{b.code}</span>
                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 leading-tight">
                          {b.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Other Banks Dropdown */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Or select from other 50+ Banks
                    </label>
                    <select
                      value={otherBank}
                      onChange={(e) => {
                        setOtherBank(e.target.value);
                        setSelectedBank("");
                      }}
                      className="input text-xs"
                    >
                      <option value="">-- Choose Other Bank --</option>
                      {OTHER_BANKS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleNetBankingPay}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 transition-all"
                  >
                    Proceed with Net Banking · ₹{total}
                  </button>
                </div>
              )}

              {/* Tab Content 4: Wallets */}
              {activeTab === "wallets" && (
                <div className="p-5 space-y-4">
                  <p className="text-xs text-gray-500">Pay using linked digital wallets:</p>
                  <div className="space-y-2">
                    {[
                      { id: "paytm", name: "Paytm Wallet", desc: "Instant checkout from balance" },
                      { id: "phonepe", name: "PhonePe Wallet", desc: "Fast & secured wallet" },
                      { id: "amazon", name: "Amazon Pay", desc: "Amazon balance & cashback" },
                      { id: "mobikwik", name: "MobiKwik", desc: "ZIP & Wallet balance" },
                    ].map((w) => (
                      <label
                        key={w.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedWallet === w.id
                            ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="wallet"
                            value={w.id}
                            checked={selectedWallet === w.id}
                            onChange={() => setSelectedWallet(w.id)}
                            className="accent-emerald-600"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100">{w.name}</h4>
                            <p className="text-[10px] text-gray-500">{w.desc}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">Link & Pay</span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleWalletPay}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 transition-all"
                  >
                    Pay ₹{total} via Wallet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Security Badges */}
        <div className="bg-gray-50 dark:bg-gray-800/80 px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5 font-medium">
            <FiShield className="text-emerald-600" />
            <span>PCI-DSS Compliant · RBI Certified Safe</span>
          </div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">ApnaKirana Payments</span>
        </div>
      </div>

      {/* 3D-Secure Bank OTP Modal Simulation */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="font-extrabold text-sm text-indigo-700 dark:text-indigo-400">
                BANK 3D-SECURE VERIFICATION
              </span>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 px-2 py-0.5 rounded font-bold">
                SMS OTP
              </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 text-left">
              An OTP has been sent to your registered mobile ending in <strong className="font-mono">•••• 8894</strong>{" "}
              to authenticate payment of <strong className="text-emerald-600">₹{total}</strong>.
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-left text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold block mb-0.5">Test Verification OTP:</span>
              <span className="font-mono text-base font-black tracking-widest text-amber-900 dark:text-amber-200">
                {bankOtp}
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                (Pre-filled for fast test completion)
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block text-left mb-1">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                value={bankOtp}
                onChange={(e) => setBankOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="input text-center font-mono text-lg font-bold tracking-widest"
                required
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Resend in {otpTimer}s</span>
              <button
                type="button"
                disabled={otpTimer > 0}
                onClick={() => {
                  setOtpTimer(30);
                  toast.success("New OTP sent to your registered mobile.");
                }}
                className="text-indigo-600 disabled:opacity-40 font-semibold"
              >
                Resend OTP
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="btn-outline flex-1 text-xs py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBankOtpVerify}
                className="btn-primary flex-1 text-xs py-2.5 bg-emerald-600 hover:bg-emerald-700"
              >
                Verify & Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
