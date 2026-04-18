import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow } from '../styles/theme';

export default function VerifyEmail() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email: string = (location.state as { email?: string })?.email ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const getDashboard = (role: string) =>
    role === 'restaurant' ? '/restaurant' : role === 'ngo' ? '/ngo' : '/admin';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      await verifyEmail(email, code);
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      navigate(getDashboard(u?.role ?? ''));
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendMsg(''); setError('');
    try {
      await resendVerification(email);
      setResendMsg('New code sent!');
      setCooldown(60);
    } catch { setError('Could not resend code.'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📧</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>Check your email</h1>
          {email && <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '6px' }}>We sent a 6-digit code to <strong style={{ color: colors.text }}>{email}</strong></p>}
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '32px', boxShadow: shadow.lg }}>
          <form onSubmit={handleVerify} noValidate>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Verification Code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" autoComplete="one-time-code"
                style={{ width: '100%', padding: '14px', background: colors.bg, border: `1px solid ${error ? colors.danger : colors.border}`, borderRadius: radius.md, color: colors.text, fontSize: '28px', fontWeight: 700, letterSpacing: '0.5rem', textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = colors.primary}
                onBlur={e => e.target.style.borderColor = error ? colors.danger : colors.border}
              />
            </div>

            {error && <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.danger, fontSize: '13px' }}>✕ {error}</div>}
            {resendMsg && <div style={{ background: colors.successLight, border: `1px solid ${colors.success}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.success, fontSize: '13px' }}>✓ {resendMsg}</div>}

            <button type="submit" disabled={loading || code.length !== 6}
              style={{ width: '100%', padding: '11px', background: (loading || code.length !== 6) ? colors.border : colors.primary, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '14px', fontWeight: 600, cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Verifying…' : 'Verify Email'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={handleResend} disabled={cooldown > 0} type="button"
              style={{ background: 'none', border: 'none', color: cooldown > 0 ? colors.textDim : colors.primary, cursor: cooldown > 0 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
