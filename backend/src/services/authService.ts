import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { sendVerificationEmail, sendPasswordResetEmail } from './emailService';

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

const SALT_ROUNDS = 10;
const JWT_EXPIRY = '24h';

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(userId: string, role: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ id: userId, role }, secret, { expiresIn: JWT_EXPIRY });
}

export async function register(
  email: string,
  password: string,
  role: 'restaurant' | 'ngo',
  orgName: string,
  location: { lat: number; lng: number }
): Promise<void> {
  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new AuthError('Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await UserModel.create({
    email,
    passwordHash,
    role,
    orgName,
    location,
    isVerified: false,
    verificationCode: codeHash,
    verificationCodeExpiry: expiry,
  });

  // Send verification email — log code to console if email sending fails (e.g. no SMTP configured)
  try {
    await sendVerificationEmail(email, code);
  } catch (emailErr) {
    console.warn(`[DEV] Email sending failed. Verification code for ${email}: ${code}`);
  }
}

export async function verifyEmail(email: string, code: string): Promise<string> {
  const user = await UserModel.findOne({ email });
  if (!user || !user.verificationCode || !user.verificationCodeExpiry) {
    throw new AuthError('Invalid verification code', 400);
  }

  if (new Date() > user.verificationCodeExpiry) {
    throw new AuthError('Verification code has expired', 400);
  }

  const isMatch = await bcrypt.compare(code, user.verificationCode);
  if (!isMatch) {
    throw new AuthError('Invalid verification code', 400);
  }

  user.isVerified = true;
  user.verificationCode = null;
  user.verificationCodeExpiry = null;
  await user.save();

  return signToken(String(user._id), user.role);
}

export async function resendVerification(email: string): Promise<void> {
  const user = await UserModel.findOne({ email });
  if (!user) {
    // Silently succeed to prevent email enumeration
    return;
  }

  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  user.verificationCode = codeHash;
  user.verificationCodeExpiry = expiry;
  await user.save();

  try {
    await sendVerificationEmail(email, code);
  } catch {
    console.warn(`[DEV] Email sending failed. New verification code for ${email}: ${code}`);
  }
}

export async function login(email: string, password: string): Promise<string> {
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new AuthError('Invalid credentials', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AuthError('Invalid credentials', 401);
  }

  if (!user.isVerified) {
    throw new AuthError('Please verify your email before logging in', 403);
  }

  return signToken(String(user._id), user.role);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await UserModel.findOne({ email });
  // Always return same response to prevent email enumeration
  if (!user) return;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  user.resetToken = otpHash;
  user.resetTokenExpiry = expiry;
  await user.save();

  try {
    await sendVerificationEmail(email, otp); // reuse verification email for OTP
  } catch {
    console.warn(`[DEV] Email sending failed. Login OTP for ${email}: ${otp}`);
  }
}

export async function verifyLoginOtp(email: string, otp: string): Promise<string> {
  const user = await UserModel.findOne({ email });
  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    throw new AuthError('Invalid or expired OTP', 400);
  }

  if (new Date() > user.resetTokenExpiry) {
    throw new AuthError('OTP has expired', 400);
  }

  const isMatch = await bcrypt.compare(otp, user.resetToken);
  if (!isMatch) {
    throw new AuthError('Invalid OTP', 400);
  }

  // Clear OTP fields
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();

  return signToken(String(user._id), user.role);
}

export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<{ token: string; user: { id: string; role: string; orgName: string } }> {
  if (newPassword.length < 8) {
    throw new AuthError('Password must be at least 8 characters', 400);
  }

  const user = await UserModel.findOne({ email });
  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    throw new AuthError('Invalid or expired OTP', 400);
  }

  if (new Date() > user.resetTokenExpiry) {
    throw new AuthError('OTP has expired', 400);
  }

  const isMatch = await bcrypt.compare(otp, user.resetToken);
  if (!isMatch) {
    throw new AuthError('Invalid OTP', 400);
  }

  // Update password and clear OTP
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();

  const token = signToken(String(user._id), user.role);
  return { token, user: { id: String(user._id), role: user.role, orgName: user.orgName } };
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new AuthError('Password must be at least 8 characters', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await UserModel.findOne({ resetToken: tokenHash });

  if (!user || !user.resetTokenExpiry) {
    throw new AuthError('Invalid or expired reset token', 400);
  }

  if (new Date() > user.resetTokenExpiry) {
    throw new AuthError('Invalid or expired reset token', 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();
}
