import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow } from '../styles/theme';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { successMessage?: string })?.successMessage ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getDashboard = (role: string) =>
    role === 'restaurant' ? '/restaurant' : role === 'ngo' ? '/ngo' : '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      navigate(getDashboard(u?.role ?? ''));
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🌱</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: colors.text }}>SurplusIQ</h1>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>AI-Driven Surplus Food Management</p>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '32px', boxShadow: shadow.lg }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: colors.text }}>Sign in to your account</h2>

          {successMessage && (
            <div style={{ background: colors.successLight, border: `1px solid ${colors.success}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.success, fontSize: '13px' }}>
              ✓ {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com" autoComplete="email"
                style={{ width: '100%', padding: '10px 14px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = colors.primary}
                onBlur={e => e.target.style.borderColor = colors.border}
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••" autoComplete="current-password"
                style={{ width: '100%', padding: '10px 14px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = colors.primary}
                onBlur={e => e.target.style.borderColor = colors.border}
              />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <Link to="/forgot-password" style={{ fontSize: '12px', color: colors.primary }}>Forgot password?</Link>
            </div>

            {error && (
              <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.danger, fontSize: '13px' }}>
                ✕ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? colors.border : colors.primary, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: colors.textMuted }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: colors.primary, fontWeight: 500 }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
