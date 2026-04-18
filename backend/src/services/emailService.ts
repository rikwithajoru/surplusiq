import nodemailer from 'nodemailer';

export class EmailError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EmailError';
  }
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // allow self-signed certs in dev
    },
  });
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: `"SurplusIQ" <${process.env.SMTP_USER}>`,
      to,
      subject: '🌱 Your SurplusIQ verification code',
      text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#e2e8f0;border-radius:12px;">
          <h2 style="color:#6366f1;margin-bottom:8px;">🌱 SurplusIQ</h2>
          <p style="color:#94a3b8;margin-bottom:24px;">Verify your email address to get started.</p>
          <div style="background:#1a1d27;border:1px solid #2a2d3e;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
            <p style="color:#94a3b8;font-size:14px;margin-bottom:8px;">Your verification code</p>
            <div style="font-size:36px;font-weight:800;letter-spacing:0.4rem;color:#6366f1;">${code}</div>
            <p style="color:#64748b;font-size:12px;margin-top:12px;">Expires in 15 minutes</p>
          </div>
          <p style="color:#64748b;font-size:12px;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    throw new EmailError('Failed to send verification email', err);
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: `"SurplusIQ" <${process.env.SMTP_USER}>`,
      to,
      subject: '🔑 Reset your SurplusIQ password',
      text: `Reset your password here: ${resetLink}\n\nThis link expires in 1 hour.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#e2e8f0;border-radius:12px;">
          <h2 style="color:#6366f1;margin-bottom:8px;">🌱 SurplusIQ</h2>
          <p style="color:#94a3b8;margin-bottom:24px;">We received a request to reset your password.</p>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Reset Password</a>
          </div>
          <p style="color:#64748b;font-size:13px;">Or copy this link:<br/><a href="${resetLink}" style="color:#6366f1;word-break:break-all;">${resetLink}</a></p>
          <p style="color:#64748b;font-size:12px;margin-top:16px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    throw new EmailError('Failed to send password reset email', err);
  }
}
