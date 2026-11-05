// sms.js
// Direct SMS Gateway integration for Real Mobile OTPs in India & globally.
// Supports:
// 1. Fast2SMS (India OTP route - https://www.fast2sms.com)
// 2. 2Factor.in (India SMS Gateway - https://2factor.in)
// 3. Twilio Verify (Global SMS Gateway - https://www.twilio.com)

export async function sendSmsOtp({ phone, otp, role = "User" }) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  // 1. Fast2SMS (Popular in India, simple API key, instant SMS delivery)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      console.log(`\n📱 [FAST2SMS] Dispatching real SMS to +91${cleanPhone}...`);
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(
        process.env.FAST2SMS_API_KEY.trim()
      )}&route=otp&variables_values=${otp}&numbers=${cleanPhone}`;

      const res = await fetch(url, { method: "GET" });
      const data = await res.json();

      if (data.return) {
        console.log(`✅ [FAST2SMS] Real OTP ${otp} delivered to +91${cleanPhone}!`);
        return {
          sent: true,
          provider: "Fast2SMS",
          message: `Real SMS sent to +91 ${cleanPhone} via Fast2SMS`,
        };
      } else {
        console.warn(`⚠️ [FAST2SMS Error]:`, data.message || data);
      }
    } catch (err) {
      console.error(`❌ [FAST2SMS Network Error]:`, err.message);
    }
  }

  // 2. 2Factor.in (Indian SMS Provider)
  if (process.env.TWOFACTOR_API_KEY) {
    try {
      console.log(`\n📱 [2FACTOR] Dispatching real SMS to +91${cleanPhone}...`);
      const url = `https://2factor.in/v3/${encodeURIComponent(
        process.env.TWOFACTOR_API_KEY.trim()
      )}/SMS/+91${cleanPhone}/${otp}/OTP1`;

      const res = await fetch(url, { method: "GET" });
      const data = await res.json();

      if (data.Status === "Success") {
        console.log(`✅ [2Factor] Real OTP delivered to +91${cleanPhone}!`);
        return {
          sent: true,
          provider: "2Factor",
          message: `Real SMS sent to +91 ${cleanPhone} via 2Factor`,
        };
      } else {
        console.warn(`⚠️ [2Factor Error]:`, data.Details || data);
      }
    } catch (err) {
      console.error(`❌ [2Factor Network Error]:`, err.message);
    }
  }

  // 3. Twilio Verify
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  ) {
    try {
      console.log(`\n📱 [TWILIO] Dispatching real SMS to +91${cleanPhone}...`);
      const twilioModule = await import("twilio");
      const twilio = twilioModule.default;
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: `+91${cleanPhone}`, channel: "sms" });

      console.log(`✅ [Twilio] Real OTP SMS initiated for +91${cleanPhone}!`);
      return {
        sent: true,
        provider: "Twilio",
        message: `Real SMS sent to +91 ${cleanPhone} via Twilio`,
      };
    } catch (err) {
      console.error(`❌ [Twilio Error]:`, err.message);
    }
  }

  console.log(`\nℹ️ [PHONE OTP] To: +91${cleanPhone} | OTP: ${otp}`);
  console.log("ℹ️ No SMS Gateway key set in backend/.env (FAST2SMS_API_KEY or TWILIO or TWOFACTOR).");
  console.log("   Displaying OTP in dev hint for seamless testing.\n");

  return {
    sent: false,
    provider: "dev",
    devHint: otp,
    message: "SMS Gateway not configured. OTP displayed for local testing.",
  };
}
