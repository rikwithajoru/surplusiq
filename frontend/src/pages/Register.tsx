import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow } from '../styles/theme';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '', orgName: '', role: 'restaurant' as 'restaurant' | 'ngo', lat: '', lng: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = 'Required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    if (!form.orgName) e.orgName = 'Required';
    const lat = parseFloat(form.lat), lng = parseFloat(form.lng);
    if (form.lat === '' || isNaN(lat) || lat < -90 || lat > 90) e.lat = 'Must be −90 to 90';
    if (form.lng === '' || isNaN(lng) || lng < -180 || lng > 180) e.lng = 'Must be −180 to 180';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.role, form.orgName, { lat: parseFloat(form.lat), lng: parseFloat(form.lng) });
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err: unknown) {
      setApiError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const inputStyle = (hasErr: boolean): React.CSSProperties => ({
    width: '100%', padding: '10px 14px', background: colors.bg,
    border: `1px solid ${hasErr ? colors.danger : colors.border}`,
    borderRadius: radius.md, color: colors.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  });

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>🌱</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>Create your account</h1>
          <p style={{ color: colors.textMuted, fontSize: '13px' }}>Join the food rescue network</p>
        </div>

        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '32px', boxShadow: shadow.lg }}>
          <form onSubmit={handleSubmit} noValidate>
            {/* Role selector */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {(['restaurant', 'ngo'] as const).map(r => (
                <button key={r} type="button" onClick={() => set('role', r)}
                  style={{ flex: 1, padding: '10px', borderRadius: radius.md, border: `2px solid ${form.role === r ? colors.primary : colors.border}`, background: form.role === r ? colors.primaryLight : 'transparent', color: form.role === r ? colors.primary : colors.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
                  {r === 'restaurant' ? '🍽 Restaurant' : '🤝 NGO'}
                </button>
              ))}
            </div>

            {[
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Min 8 characters' },
              { key: 'orgName', label: 'Organisation Name', type: 'text', placeholder: 'e.g. Green Leaf Bistro' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>{label}</label>
                <input type={type} value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)}
                  placeholder={placeholder} style={inputStyle(!!errors[key])} />
                {errors[key] && <span style={{ color: colors.danger, fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors[key]}</span>}
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[{ key: 'lat', label: 'Latitude', placeholder: '-90 to 90' }, { key: 'lng', label: 'Longitude', placeholder: '-180 to 180' }].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.textMuted }}>{label}</label>
                  <input type="number" value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)}
                    placeholder={placeholder} style={inputStyle(!!errors[key])} />
                  {errors[key] && <span style={{ color: colors.danger, fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors[key]}</span>}
                </div>
              ))}
            </div>

            {apiError && (
              <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '10px 14px', marginBottom: '16px', color: colors.danger, fontSize: '13px' }}>
                ✕ {apiError}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? colors.border : colors.primary, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: colors.textMuted }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: colors.primary, fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
