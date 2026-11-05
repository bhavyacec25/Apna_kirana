// mailer.js
// Nodemailer integration for Gmail SMTP to send real OTPs, shopkeeper invitations,
// and legal registration verification updates.

import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send an OTP code to a recipient email.
 */
export async function sendOtpEmail({ to, otp, role = "User" }) {
  const transporter = getTransporter();

  console.log(`\n📧 [OTP GENERATED] To: ${to} | Role: ${role} | OTP: ${otp}`);

  if (!transporter) {
    console.log("ℹ️ GMAIL_USER or GMAIL_APP_PASSWORD not set in .env. Falling back to dev OTP display.");
    return {
      sent: false,
      devHint: otp,
      message: "Gmail SMTP not configured. OTP displayed on screen / console for local testing.",
    };
  }

  const mailOptions = {
    from: `"ApnaKirana" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Your ApnaKirana Login OTP: ${otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🏪 ApnaKirana</h1>
          <p style="color: #bbf7d0; margin: 6px 0 0 0; font-size: 14px;">Your local neighborhood kirana delivery</p>
        </div>
        <div style="padding: 28px 24px;">
          <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px 0;">Authentication Code</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
            Use the following 6-digit One-Time Password (OTP) to securely sign into your ApnaKirana account as <strong>${role}</strong>.
          </p>
          <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #16a34a;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            This OTP is valid for 10 minutes. If you did not request this verification, please ignore this email.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 12px; color: #64748b;">
          © ${new Date().getFullYear()} ApnaKirana Platform. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send email via Gmail: ${err.message}`);
    return {
      sent: false,
      devHint: otp,
      error: err.message,
      message: "Failed to send email. Check GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env.",
    };
  }
}

/**
 * Send Shopkeeper invitation with OTP and registration instructions.
 */
export async function sendShopkeeperInviteEmail({ to, shopkeeperName, shopName, otp, loginUrl }) {
  const transporter = getTransporter();

  console.log(`\n🏪 [SHOPKEEPER INVITED] Email: ${to} | Name: ${shopkeeperName} | Shop: ${shopName} | OTP: ${otp}`);

  if (!transporter) {
    console.log("ℹ️ GMAIL_USER or GMAIL_APP_PASSWORD not set in .env. Falling back to dev OTP display.");
    return {
      sent: false,
      devHint: otp,
      message: "Gmail SMTP not configured. OTP displayed on screen / console for admin.",
    };
  }

  const portalUrl = loginUrl || "http://localhost:5173/login";

  const mailOptions = {
    from: `"ApnaKirana Admin" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Welcome to ApnaKirana! Your Shopkeeper Access Code & OTP: ${otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 28px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">🏪 Welcome to ApnaKirana</h1>
          <p style="color: #dcfce7; margin: 8px 0 0 0; font-size: 14px;">Official Shopkeeper Onboarding & Registration</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="color: #1e293b; font-size: 16px; margin: 0 0 12px 0;">Hello <strong>${shopkeeperName || "Shop Partner"}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 18px 0;">
            Congratulations! The platform administrator has invited your shop <strong>${shopName}</strong> to join the ApnaKirana network.
          </p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; color: #166534; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Direct Login Access OTP</p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #15803d;">${otp}</div>
            <p style="margin: 8px 0 0 0; color: #166534; font-size: 12px;">Use your registered email (<strong>${to}</strong>) and this OTP to log in.</p>
          </div>

          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">Government & Legal Verification Next Steps:</p>
            <p style="margin: 6px 0 0 0; color: #78350f; font-size: 12px; line-height: 1.5;">
              Once you log in to your Shopkeeper Area, navigate to <strong>Legal & GST Registration</strong> to submit your Government Authorized GSTIN, FSSAI License, and Trade License documents to activate your shop for customer orders.
            </p>
          </div>

          <div style="text-align: center; margin: 28px 0 10px 0;">
            <a href="${portalUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Log in to Shopkeeper Portal →
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          ApnaKirana Verified Merchant Partner Program • Need support? Reply directly to this email.
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Invite email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send invite email via Gmail: ${err.message}`);
    return {
      sent: false,
      devHint: otp,
      error: err.message,
      message: "Failed to send email. Check GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env.",
    };
  }
}
