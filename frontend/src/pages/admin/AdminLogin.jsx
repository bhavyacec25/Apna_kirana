import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  FiShield,
  FiLock,
  FiMail,
  FiPhone,
  FiArrowRight,
  FiCheckCircle,
  FiAlertTriangle,
  FiEdit2,
  FiArrowLeft,
} from "react-icons/fi";

export default function AdminLogin() {
  const { requestOtp, login, user } = useAuth();
  const navigate = useNavigate();

  const [authMethod, setAuthMethod] = useState("phone");
  const [step, setStep] = useState("input");
  const [phone, setPhone] = useState("8283833894");
  const [email, setEmail] = useState("chhajerbhavya30@gmail.com");

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // If already logged in as admin, redirect to admin dashboard
  useEffect(() => {
    if (user && user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, navigate]);

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

  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setError("");

    const isEmail = authMethod === "email";
    if (isEmail) {
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
        setError("Please enter a valid administrator email address.");
        return;
      }
    } else {
      if (!/^\d{10}$/.test(phone)) {
        setError("Please enter a valid 10-digit administrator mobile number.");
        return;
      }
    }

    setLoading(true);
    try {
      const identifier = isEmail ? email.trim() : phone.trim();

      const res = await requestOtp(identifier, "admin");
      setStep("otp");
      setCountdown(30);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);

      if (isEmail) {
        toast.success(`Admin verification code sent to ${email} via Gmail!`);
      } else {
        toast.success(`Admin verification code sent to WhatsApp +91 ${phone}!`, { icon: "💬" });
      }
    } catch (err) {
      setError(err.message || "Failed to dispatch administrator authentication code.");
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    if (e) e.preventDefault();
    setError("");

    if (currentOtpValue.length < 4) {
      setError("Please enter the complete 6-digit administrator code.");
      return;
    }

    setLoading(true);
    try {
      const isEmail = authMethod === "email";
      const adminUser = await login({
        ...(isEmail ? { email: email.trim().toLowerCase() } : { phone }),
        otp: currentOtpValue,
        role: "admin",
      });

      toast.success(`Welcome back, ${adminUser.name || "Administrator"}! 🛡️`);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid or unauthorized administrator verification code.");
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative overflow-hidden">
      {/* Executive Dark Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-teal-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <FiArrowLeft size={14} /> Back to Customer Store
        </Link>
        <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Restricted Admin Portal</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Brand & Security Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-3xl mx-auto shadow-2xl shadow-emerald-950/60 border border-emerald-400/30 mb-4">
              🛡️
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ApnaKirana Executive
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              Master Administration &amp; Operations Control
            </p>
          </div>

          {/* Secure Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            {/* Security Warning Notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-2xl p-3.5 mb-6 flex items-start gap-2.5">
              <FiAlertTriangle className="text-base shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-bold">Authorized Personnel Only</p>
                <p className="text-[11px] text-amber-400/90 mt-0.5 leading-relaxed">
                  Only pre-authorized administrative credentials can access this console. Unauthorized access attempts are monitored and blocked.
                </p>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-semibold rounded-2xl p-3.5 mb-5"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 1: Input */}
            {step === "input" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {/* Method selector (WhatsApp or Email) */}
                <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-2xl mb-4">
                  {[
                    { key: "phone", label: "💬 WhatsApp OTP", icon: FiPhone },
                    { key: "email", label: "✉️ Email OTP", icon: FiMail },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAuthMethod(key)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        authMethod === key
                          ? "bg-slate-800 text-white shadow-sm border border-slate-700/60"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {authMethod === "phone" ? (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Master Administrator Mobile
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-300 shrink-0">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                        placeholder="10-digit mobile"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Master Administrator Email
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                        placeholder="admin@apnakirana.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-950/50 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Authenticating…
                    </span>
                  ) : (
                    <>
                      Generate Admin Key <FiArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === "otp" && (
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-medium">Authentication code sent to</p>
                    <p className="text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                      {authMethod === "phone" ? (
                        <>
                          <span>💬</span> +91 {phone}
                        </>
                      ) : (
                        email
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setOtpDigits(["", "", "", "", "", ""]);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <FiEdit2 size={11} /> Edit
                  </button>
                </div>

                {authMethod === "phone" && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💬</span>
                      <div>
                        <p className="font-extrabold text-emerald-300 text-xs">WhatsApp OTP Dispatched</p>
                        <p className="text-[10px] text-emerald-400">Check your WhatsApp on +91 {phone}</p>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/91${phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded-lg shrink-0 transition"
                    >
                      Open WhatsApp &rarr;
                    </a>
                  </div>
                )}

                {/* 6 Individual Square OTP Boxes */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center mb-3">
                    Enter 6-Digit Admin Security Code
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
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono rounded-xl bg-slate-950 border-2 border-slate-800 text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Countdown */}
                <div className="text-center text-xs text-slate-400 font-medium">
                  {!canResend ? (
                    <span>Resend code in <b className="text-white">00:{countdown < 10 ? `0${countdown}` : countdown}s</b></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-emerald-400 font-bold hover:underline"
                    >
                      Resend authentication code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || currentOtpValue.length < 4}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-950/60 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Verifying Clearance…
                    </span>
                  ) : (
                    <>
                      <FiCheckCircle size={16} /> Enter Admin Console
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600 relative z-10 border-t border-slate-900">
        ApnaKirana Administration Framework · Secure TLS v1.3 Protected
      </footer>
    </div>
  );
}
