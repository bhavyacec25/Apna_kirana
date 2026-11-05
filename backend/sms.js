export async function sendSmsOtp({ phone, otp, role = "User" }) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  // 1. WhatsApp Gateway (UltraMsg: https://ultramsg.com)
  if (process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_INSTANCE_ID) {
    try {
      console.log(`\n💬 [WHATSAPP - UltraMsg] Dispatching real OTP to +91${cleanPhone}...`);
      const url = `https://api.ultramsg.com/${encodeURIComponent(
        process.env.WHATSAPP_INSTANCE_ID.trim()
      )}/messages/chat`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: process.env.WHATSAPP_API_KEY.trim(),
          to: `91${cleanPhone}`,
          body: `🛍️ *ApnaKirana Verification Code*\n\nYour 6-digit login OTP is: *${otp}*\n\nValid for 15 minutes. Never share this code with anyone.\n\n— ApnaKirana Instant Delivery`,
        }),
      });

      const data = await res.json();
      if (data.sent === "true" || data.id) {
        console.log(`✅ [WHATSAPP] Real OTP ${otp} delivered to WhatsApp +91${cleanPhone}!`);
        return {
          sent: true,
          provider: "WhatsApp",
          message: `Real OTP sent to WhatsApp +91 ${cleanPhone}!`,
        };
      } else {
        console.warn(`⚠️ [WhatsApp UltraMsg Error]:`, data);
      }
    } catch (err) {
      console.error(`❌ [WhatsApp UltraMsg Network Error]:`, err.message);
    }
  }

  // 2. WhatsApp Gateway (Green-API: https://green-api.com)
  if (process.env.GREENAPI_ID_INSTANCE && process.env.GREENAPI_API_TOKEN) {
    try {
      console.log(`\n💬 [WHATSAPP - GreenAPI] Dispatching real OTP to +91${cleanPhone}...`);
      const url = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID_INSTANCE.trim()}/sendMessage/${process.env.GREENAPI_API_TOKEN.trim()}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: `91${cleanPhone}@c.us`,
          message: `🛍️ *ApnaKirana Verification Code*\n\nYour 6-digit login OTP is: *${otp}*\n\nValid for 15 minutes. Never share this code with anyone.\n\n— ApnaKirana Instant Delivery`,
        }),
      });

      const data = await res.json();
      if (data.idMessage) {
        console.log(`✅ [Green-API] Real OTP ${otp} delivered to WhatsApp +91${cleanPhone}!`);
        return {
          sent: true,
          provider: "WhatsApp",
          message: `Real OTP sent to WhatsApp +91 ${cleanPhone}!`,
        };
      } else {
        console.warn(`⚠️ [Green-API Error]:`, data);
      }
    } catch (err) {
      console.error(`❌ [Green-API Network Error]:`, err.message);
    }
  }

  // 3. Fast2SMS (Popular in India, simple API key, instant SMS delivery)
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

  // 4. 2Factor.in (Indian SMS Provider)
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

  // 5. Twilio Verify
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

  console.log(`\nℹ️ [PHONE / WHATSAPP OTP] To: +91${cleanPhone} | OTP: ${otp}`);
  console.log("ℹ️ No WhatsApp Gateway or SMS Key set in backend/.env.");
  console.log("   Displaying OTP in dev hint for seamless testing.\n");

  return {
    sent: false,
    provider: "dev",
    devHint: otp,
    message: "OTP ready for +91 " + cleanPhone,
  };
}

export async function sendAdminWelcomeAlert({ phone, name, designation = "Operations Admin" }) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_INSTANCE_ID) {
    try {
      const url = `https://api.ultramsg.com/${encodeURIComponent(
        process.env.WHATSAPP_INSTANCE_ID.trim()
      )}/messages/chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: process.env.WHATSAPP_API_KEY.trim(),
          to: `91${cleanPhone}`,
          body: `🛡️ *ApnaKirana Executive Clearance*\n\nHello *${name}*,\nYou have been authorized as *${designation}* on ApnaKirana.\n\nYou can access the Private Executive Admin Console at:\nhttp://localhost:5173/admin/login\n\nLogin using your mobile: *+91 ${cleanPhone}*.\n\n— ApnaKirana Operations Command`,
        }),
      });
      return await res.json();
    } catch (err) {
      console.warn("⚠️ [WhatsApp Admin Alert]:", err.message);
    }
  }
}
