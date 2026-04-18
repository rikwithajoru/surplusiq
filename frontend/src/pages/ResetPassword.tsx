import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow } from '../styles/theme';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle = (hasErr: boolean): React.CSSProperties => ({
    width: '100%', padding: '10px 14px', background: colors.bg,
    border: `1px solid ${hasErr ? colors.danger : colors.border}`,
    borderRadius: radius.md, color: colors.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs: Record<string, string> = {};
    if (password.length < 8) errs.password = 'Min 8 characters';
    if (password !== confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate('/login', { state: { successMessage: 'Password reset successfully. Please sign in.' } });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Reset failed. Link may be invalid or expired.');
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: colors.danger, marginBottom: '12px' }}>Invalid or missing reset token.</p>
        <Link to="/forgot-password" style={{ color: colors.primary }}>Request a new link</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔒</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>Set new password</h1>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '32px', boxShadow: shadow.lg }}>
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" style={inputStyle(!!fieldErrors.password)} autoComplete="new-password" />
              {fieldErrors.password && <span style={{ color: colors.danger, fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.password}</span>}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" style={inputStyle(!!fieldErrors.confirm)} autoComplete="new-password" />
              {fieldErrors.confirm && <span style={{ color: colors.danger, fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.confirm}</span>}
            </div>

            {error && <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.danger, fontSize: '13px' }}>✕ {error}</div>}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? colors.border : colors.primary, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
            <Link to="/login" style={{ color: colors.primary }}>← Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
