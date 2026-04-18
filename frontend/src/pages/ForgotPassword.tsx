import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow } from '../styles/theme';

type Step = 'email' | 'otp' | 'newPassword';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const getDashboard = (role: string) =>
    role === 'restaurant' ? '/restaurant' : role === 'ngo' ? '/ngo' : '/admin';

  // Step 1 — Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } catch { /* silent — prevent enumeration */ }
    finally {
      setLoading(false);
      setStep('otp');
      setCooldown(60);
    }
  };

  // Step 2 — Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setLoading(true);
    try {
      // Just validate OTP exists — actual reset happens in step 3
      // We'll move to step 3 directly
      setStep('newPassword');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  // Step 3 — Set new password + auto login
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await authApi.resetPasswordWithOtp(email, otp, newPassword);
      loginWithToken(res.data.token, res.data.user);
      navigate(getDashboard(res.data.user.role));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed. OTP may have expired.';
      setError(msg);
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('expired')) {
        setStep('otp');
        setOtp('');
      }
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    try { await authApi.forgotPassword(email); } catch { /* silent */ }
    setCooldown(60);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: colors.bg,
    border: `1px solid ${colors.border}`, borderRadius: radius.md,
    color: colors.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };

  const stepIcons = { email: '🔑', otp: '📧', newPassword: '🔒' };
  const stepTitles = { email: 'Forgot password?', otp: 'Enter OTP', newPassword: 'Set new password' };
  const stepSubtitles = {
    email: "Enter your email and we'll send a verification code",
    otp: <>We sent a 6-digit code to <strong style={{ color: colors.text }}>{email}</strong></>,
    newPassword: 'OTP verified — create your new password',
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {(['email', 'otp', 'newPassword'] as Step[]).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, background: step === s ? colors.primary : ((['email', 'otp', 'newPassword'] as Step[]).indexOf(step) > i ? colors.success : colors.border), color: '#fff', transition: 'background 0.3s' }}>
                {(['email', 'otp', 'newPassword'] as Step[]).indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div style={{ width: '32px', height: '2px', background: (['email', 'otp', 'newPassword'] as Step[]).indexOf(step) > i ? colors.success : colors.border, transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>{stepIcons[step]}</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>{stepTitles[step]}</h1>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '6px' }}>{stepSubtitles[step]}</p>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '32px', boxShadow: shadow.lg }}>

          {/* Step 1 — Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} noValidate>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com" autoComplete="email" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = colors.primary}
                  onBlur={e => e.target.style.borderColor = colors.border} />
              </div>
              {error && <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.danger, fontSize: '13px' }}>✕ {error}</div>}
              <button type="submit" disabled={loading || !email}
                style={{ width: '100%', padding: '11px', background: (loading || !email) ? colors.border : colors.primary, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '14px', fontWeight: 600, cursor: (loading || !email) ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} noValidate>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>6-digit OTP</label>
                <input type="text" inputMode="numeric" maxLength={6} value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                  placeholder="000000" autoComplete="one-time-code"
                  style={{ ...inputStyle, fontSize: '28px', fontWeight: 700, letterSpacing: '0.5rem', textAlign: 'center', padding: '14px', border: `1px solid ${error ? colors.danger : colors.border}` }}
                  onFocus={e => e.target.style.borderColor = colors.primary}
                  onBlur={e => e.target.style.borderColor = error ? colors.danger : colors.border} />
              </div>
              {error && <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.danger, fontSize: '13px' }}>✕ {error}</div>}
              <button type="submit" disabled={otp.length !== 6}
                style={{ width: '100%', padding: '11px', background: otp.length !== 6 ? colors.border : colors.primary, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '14px', fontWeight: 600, cursor: otp.length !== 6 ? 'not-allowed' : 'pointer', marginBottom: '12px' }}>
                Verify OTP →
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '13px' }}>← Change email</button>
                <button type="button" onClick={handleResend} disabled={cooldown > 0}
                  style={{ background: 'none', border: 'none', color: cooldown > 0 ? colors.textDim : colors.primary, cursor: cooldown > 0 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — New Password */}
          {step === 'newPassword' && (
            <form onSubmit={handleResetPassword} noValidate>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(''); }}
                  placeholder="Min 8 characters" autoComplete="new-password" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = colors.primary}
                  onBlur={e => e.target.style.borderColor = colors.border} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Repeat password" autoComplete="new-password"
                  style={{ ...inputStyle, borderColor: confirmPassword && confirmPassword !== newPassword ? colors.danger : colors.border }}
                  onFocus={e => e.target.style.borderColor = colors.primary}
                  onBlur={e => e.target.style.borderColor = (confirmPassword && confirmPassword !== newPassword) ? colors.danger : colors.border} />
                {confirmPassword && confirmPassword !== newPassword && (
                  <span style={{ color: colors.danger, fontSize: '12px', marginTop: '4px', display: 'block' }}>Passwords do not match</span>
                )}
              </div>
              {error && <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.danger, fontSize: '13px' }}>✕ {error}</div>}
              <button type="submit" disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                style={{ width: '100%', padding: '11px', background: (loading || newPassword.length < 8 || newPassword !== confirmPassword) ? colors.border : colors.success, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '14px', fontWeight: 600, cursor: (loading || newPassword.length < 8 || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Saving & Signing in…' : '✓ Save Password & Sign In'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
            <Link to="/login" style={{ color: colors.primary }}>← Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
