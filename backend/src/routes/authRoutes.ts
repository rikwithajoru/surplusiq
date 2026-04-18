import { Router, Request, Response } from 'express';
import { AuthError, register, login, verifyEmail, resendVerification, forgotPassword, verifyLoginOtp, resetPasswordWithOtp } from '../services/authService';
import { UserModel } from '../models/User';

const router = Router();

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role, orgName, location } = req.body;

    if (!email) return res.status(400).json({ error: "Field 'email' is required" });
    if (!password) return res.status(400).json({ error: "Field 'password' is required" });
    if (!role) return res.status(400).json({ error: "Field 'role' is required" });
    if (!orgName) return res.status(400).json({ error: "Field 'orgName' is required" });

    await register(email, password, role, orgName, location);
    return res.status(201).json({ message: 'Verification code sent to email' });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: "Field 'email' is required" });
    if (!password) return res.status(400).json({ error: "Field 'password' is required" });

    const token = await login(email, password);
    const user = await UserModel.findOne({ email }).select('_id role orgName');

    return res.json({
      token,
      user: {
        id: String(user!._id),
        role: user!.role,
        orgName: user!.orgName,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/verify-email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email) return res.status(400).json({ error: "Field 'email' is required" });
    if (!code) return res.status(400).json({ error: "Field 'code' is required" });

    const token = await verifyEmail(email, code);
    return res.json({ token });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/resend-verification
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Field 'email' is required" });

    await resendVerification(email);
    return res.json({ message: 'New verification code sent' });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/forgot-password — sends 6-digit OTP to email
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Field 'email' is required" });
    await forgotPassword(email);
    return res.json({ message: 'If that email exists, a login OTP was sent' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.statusCode).json({ error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/verify-login-otp — verify OTP and return token to log in directly
router.post('/verify-login-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email) return res.status(400).json({ error: "Field 'email' is required" });
    if (!otp) return res.status(400).json({ error: "Field 'otp' is required" });
    const token = await verifyLoginOtp(email, otp);
    const user = await UserModel.findOne({ email }).select('_id role orgName');
    return res.json({ token, user: { id: String(user!._id), role: user!.role, orgName: user!.orgName } });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.statusCode).json({ error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/reset-password-otp — verify OTP + set new password + auto login
router.post('/reset-password-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email) return res.status(400).json({ error: "Field 'email' is required" });
    if (!otp) return res.status(400).json({ error: "Field 'otp' is required" });
    if (!newPassword) return res.status(400).json({ error: "Field 'newPassword' is required" });
    const result = await resetPasswordWithOtp(email, otp, newPassword);
    return res.json(result);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.statusCode).json({ error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/reset-password (kept for compatibility)
router.post('/reset-password', async (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Use /auth/verify-login-otp instead' });
});

export default router;
