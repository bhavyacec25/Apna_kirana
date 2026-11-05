import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  FiMail,
  FiPhone,
  FiArrowRight,
  FiCheckCircle,
  FiEdit2,
  FiShield,
  FiZap,
  FiShoppingBag,
  FiAlertCircle,
  FiHelpCircle,
} from "react-icons/fi";
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebase";

/* ── Instamart Category Badges ──────────────────────────── */
const QUICK_TAGS = [
  { emoji: "🥑", label: "Farm Fresh" },
  { emoji: "🥛", label: "Milk & Dairy" },
  { emoji: "🍞", label: "Bakery & Breads" },
  { emoji: "🍫", label: "Snacks & Drinks" },
];

export default function Login() {
  const { requestOtp, login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("customer"); // 'customer' | 'shopkeeper' | 'admin'
  const [authMethod, setAuthMethod] = useState("phone"); // 'phone' | 'email'
  const [step, setStep] = useState("input"); // 'input' | 'otp'

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");

  // 6-digit individual OTP state (Instamart / Zepto style)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [devHint, setDevHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFirebaseSmsSent, setIsFirebaseSmsSent] = useState(false);
  const [firebaseNote, setFirebaseNote] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer = null;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Focus first OTP box upon reaching step 'otp'
  useEffect(() => {
    if (step === "otp" && otpRefs.current[0]) {
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Handle individual OTP inputs
  function handleOtpDigitChange(index, value) {
    const char = value.slice(-1).replace(/\D/g, "");
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setOtpDigits(updated);
    const nextIdx = Math.min(pasted.length, 5);
    otpRefs.current[nextIdx]?.focus();
  }

  const currentOtpValue = otpDigits.join("");

  /* ── Send OTP Handler ─────────────────────────────────── */
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setError("");
    setFirebaseNote("");

    const isEmail = authMethod === "email";
    if (isEmail) {
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
        setError("Please enter a valid email address (e.g. yourname@gmail.com).");
        return;
      }
    } else {
      if (!/^\d{10}$/.test(phone)) {
        setError("Please enter a valid 10-digit Indian mobile number.");
        return;
      }
    }

    setLoading(true);
    try {
      const identifier = isEmail ? email.trim() : phone.trim();
      let fbSmsSuccess = false;

      // Real Phone Auth via Firebase Client SDK
      if (!isEmail) {
        try {
          if (window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.clear();
            } catch {}
            window.recaptchaVerifier = null;
          }

          window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
            callback: () => {},
          });

          const formattedPhone = `+91${phone.trim()}`;
          const confirmation = await signInWithPhoneNumber(
            auth,
            formattedPhone,
            window.recaptchaVerifier
          );
          window.confirmationResult = confirmation;
          fbSmsSuccess = true;
          setIsFirebaseSmsSent(true);
          toast.success(`Real SMS sent to +91 ${phone} via Firebase!`);
        } catch (fbErr) {
          console.warn("Firebase Phone Auth note:", fbErr.code, fbErr.message);
          let noteMsg = "";
          if (fbErr.code === "auth/operation-not-allowed") {
            noteMsg =
              "Phone sign-in is disabled in Firebase Console. Enable it under Authentication → Sign-in method → Phone.";
          } else if (fbErr.code === "auth/unauthorized-domain") {
            noteMsg =
              "Domain unauthorized. Add 'localhost' in Firebase Console → Authentication → Settings → Authorized domains.";
          } else if (fbErr.code === "auth/billing-not-enabled") {
            noteMsg =
              "Firebase project requires Identity Platform billing or test phone numbers for SMS delivery.";
          } else {
            noteMsg = `Firebase note: ${fbErr.message}`;
          }
          setFirebaseNote(noteMsg);
        }
      }

      // Backend OTP generation & multi-channel dispatch (Gmail SMTP / Fast2SMS / Twilio)
      const res = await requestOtp(identifier, role);
      setDevHint(res.devHint || "");
      setStep("otp");
      setCountdown(30);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);

      if (isEmail) {
        toast.success(`OTP sent to ${email} via Gmail!`);
      } else if (res.channel === "sms" && !res.devHint) {
        toast.success(res.message || `Real SMS OTP sent to +91 ${phone}!`);
      } else if (!fbSmsSuccess) {
        toast.success(`OTP ready for +91 ${phone}!`);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Verify OTP Handler ───────────────────────────────── */
  async function handleVerify(e) {
    if (e) e.preventDefault();
    setError("");

    if (currentOtpValue.length < 4) {
      setError("Please enter the complete OTP code.");
      return;
    }

    setLoading(true);
    try {
      const isEmail = authMethod === "email";
      let firebaseVerified = false;

      // Verify with Firebase Confirmation Result if active
      if (!isEmail && window.confirmationResult) {
        try {
          await window.confirmationResult.confirm(currentOtpValue);
          firebaseVerified = true;
        } catch (fbErr) {
          console.warn("Firebase code verify note:", fbErr.message);
        }
      }

      const user = await login({
        ...(isEmail ? { email: email.trim().toLowerCase() } : { phone }),
        otp: currentOtpValue,
        role,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(shopName.trim() ? { shopName: shopName.trim() } : {}),
        firebaseVerified,
      });

      toast.success(`Welcome to ApnaKirana, ${user.name?.split(" ")[0] || "Shopper"}! 🎉`);

      if (user.role === "shopkeeper" && (user.status === "pending" || user.legal?.status !== "verified")) {
        toast("Complete your GST Registration to receive online orders!", {
          icon: "📋",
          duration: 5000,
        });
      }

      navigate(
        user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "shopkeeper"
          ? "/shopkeeper/dashboard"
          : "/customer"
      );
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function autoFillDevOtp() {
    if (!devHint) return;
    const digits = devHint.split("").slice(0, 6);
    const updated = ["", "", "", "", "", ""];
    digits.forEach((d, i) => {
      updated[i] = d;
    });
    setOtpDigits(updated);
    toast.success("Test OTP auto-filled!");
  }

  return (
    <div className="min-h-screen bg-[#fcf9f5] flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" />

      {/* Top Instamart Brand Nav */}
      <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-2xl shadow-md text-white">
            🛍️
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-1.5">
              ApnaKirana
              <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                10 Mins
              </span>
            </span>
            <p className="text-[11px] text-gray-500 font-medium -mt-0.5">India's Instant Grocery &amp; Kirana</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <FiZap size={13} className="text-emerald-600 fill-emerald-600" /> Free Delivery above ₹500
          </span>
        </div>
      </header>

      {/* Main Hero & Login Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md">
          {/* Instamart Headline */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-amber-900 text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full mb-3 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              ⚡ Instant 10-Minute Delivery
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight leading-tight">
              Groceries &amp; Daily Kirana
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
              Fresh vegetables, dairy, snacks &amp; household items delivered fast.
            </p>

            {/* Instamart Visual Category Pills */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3">
              {QUICK_TAGS.map((t) => (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-white border border-gray-200/80 px-2.5 py-0.5 rounded-full shadow-2xs"
                >
                  <span>{t.emoji}</span> {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Instamart Login Card */}
          <div className="bg-white rounded-[28px] shadow-xl shadow-gray-200/60 border border-gray-200/80 p-6 sm:p-8 relative overflow-hidden">
            {/* Top Role Selector (Shopper / Store Owner / Admin) */}
            <div className="flex bg-gray-100/80 p-1 rounded-2xl mb-6">
              {[
                { key: "customer", label: "🛒 Shopper" },
                { key: "shopkeeper", label: "🏪 Store Owner" },
                { key: "admin", label: "🔑 Admin" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setRole(key);
                    setStep("input");
                    if (key === "shopkeeper") setAuthMethod("email");
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    role === key
                      ? "bg-white text-gray-950 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl p-3 mb-4 flex items-start gap-2"
                >
                  <FiAlertCircle className="shrink-0 mt-0.5 text-sm" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Role Onboarding Hints */}
            {role === "shopkeeper" && (
              <div className="bg-violet-50 border border-violet-200/80 text-violet-900 text-xs rounded-xl p-3 mb-4">
                💼 <b>Partner Store Portal:</b> Enter your registered email or phone to manage inventory, track orders, and configure delivery.
              </div>
            )}
            {role === "admin" && (
              <div className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl p-3 mb-4">
                🔑 <b>Platform Admin:</b> Pre-configured demo admin mobile: <b>8283833894</b>
              </div>
            )}

            {/* STEP 1: Input Mobile / Email */}
            {step === "input" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {/* Name Field (if registering) */}
                {role !== "admin" && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      {role === "shopkeeper" ? "Shop Owner Name" : "Your Name"}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Shop Name Field (for shopkeepers) */}
                {role === "shopkeeper" && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      placeholder="e.g. Krishna Kirana &amp; Supermart"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Main Identifier: Mobile or Email */}
                {authMethod === "phone" ? (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      Mobile Number
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Indian Flag Badge */}
                      <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-3 text-sm font-bold text-gray-800 shrink-0 select-none">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 font-extrabold tracking-wider placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        placeholder="10-digit number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      Email Address (Gmail OTP)
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        placeholder="yourname@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Method Switcher Link */}
                <div className="flex justify-between items-center text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAuthMethod(authMethod === "phone" ? "email" : "phone")}
                    className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    {authMethod === "phone" ? "✉️ Use Email OTP instead" : "📱 Use Phone OTP (+91) instead"}
                  </button>
                </div>

                {/* Instamart Primary CTA Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-700/20 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending OTP...
                    </span>
                  ) : (
                    <>
                      Continue <FiArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Terms notice */}
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  By continuing, you agree to ApnaKirana's{" "}
                  <span className="underline cursor-pointer">Terms of Service</span> &amp;{" "}
                  <span className="underline cursor-pointer">Privacy Policy</span>.
                </p>
              </form>
            )}

            {/* STEP 2: Instamart 6-Box OTP Verification */}
            {step === "otp" && (
              <form onSubmit={handleVerify} className="space-y-5">
                {/* OTP Sent Destination Header */}
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-medium">OTP sent to</p>
                    <p className="text-sm font-extrabold text-gray-900 truncate">
                      {authMethod === "phone" ? `+91 ${phone}` : email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setOtpDigits(["", "", "", "", "", ""]);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1.5 rounded-lg shadow-xs hover:bg-emerald-50 transition"
                  >
                    <FiEdit2 size={11} /> Edit
                  </button>
                </div>

                {/* Real SMS notification badge */}
                {isFirebaseSmsSent && (
                  <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl p-2.5 flex items-center gap-2">
                    <FiCheckCircle className="text-green-600 shrink-0" size={14} />
                    <span>Real SMS OTP dispatched to your mobile via Firebase!</span>
                  </div>
                )}

                {/* Firebase config troubleshooting helper if SMS couldn't be sent */}
                {firebaseNote && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <FiHelpCircle size={14} className="text-amber-700" /> Real SMS Setup Note:
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">{firebaseNote}</p>
                    <p className="text-[10px] text-gray-500">
                      💡 <i>You can use the instant OTP below or test OTP <b>123456</b> to log in right now!</i>
                    </p>
                  </div>
                )}

                {/* Dev Hint Box (Fast testing OTP) */}
                {devHint && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Your Login OTP</p>
                      <p className="text-sm font-black font-mono text-gray-900 tracking-wider">{devHint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={autoFillDevOtp}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs transition"
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                {/* 6 Individual Square OTP Boxes */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block text-center mb-3">
                    Enter 6-Digit OTP
                  </label>
                  <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Countdown */}
                <div className="text-center text-xs text-gray-500 font-medium">
                  {!canResend ? (
                    <span>Resend OTP in <b className="text-gray-800">00:{countdown < 10 ? `0${countdown}` : countdown}s</b></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Didn't receive OTP? Resend via SMS
                    </button>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || currentOtpValue.length < 4}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-700/20 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    <>
                      <FiCheckCircle size={16} /> Verify &amp; Continue
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Trust Badges Footer */}
          <div className="mt-8 grid grid-cols-3 gap-2 text-center">
            <div className="p-2">
              <span className="text-lg">⚡</span>
              <p className="text-[11px] font-bold text-gray-700 mt-0.5">10 Mins</p>
              <p className="text-[10px] text-gray-400">Fast doorstep delivery</p>
            </div>
            <div className="p-2">
              <span className="text-lg">🛡️</span>
              <p className="text-[11px] font-bold text-gray-700 mt-0.5">100% Genuine</p>
              <p className="text-[10px] text-gray-400">Fresh from local kirana</p>
            </div>
            <div className="p-2">
              <span className="text-lg">🔒</span>
              <p className="text-[11px] font-bold text-gray-700 mt-0.5">Instant OTP</p>
              <p className="text-[10px] text-gray-400">Safe &amp; passwordless</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-200/60">
        ApnaKirana Instant Commerce Private Limited · Made with ❤️ for Local Kirana Stores
      </footer>
    </div>
  );
}
