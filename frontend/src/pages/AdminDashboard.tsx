import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi } from '../api/client';
import NavBar from '../components/NavBar';
import { colors, radius, shadow } from '../styles/theme';

interface AnalyticsData { totalKgSaved: number; totalDonations: number; estimatedPeopleFed: number; estimatedCO2Reduced: number; }

const METRICS = [
  { key: 'totalKgSaved', label: 'Food Saved', unit: 'kg', icon: '🌾', color: colors.success },
  { key: 'totalDonations', label: 'Donations', unit: '', icon: '🤝', color: colors.primary },
  { key: 'estimatedPeopleFed', label: 'People Fed', unit: '', icon: '🍽', color: colors.warning },
  { key: 'estimatedCO2Reduced', label: 'CO₂ Reduced', unit: 'kg', icon: '🌍', color: '#22d3ee' },
];

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async (f?: string, t?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await analyticsApi.getAnalytics(f || undefined, t || undefined);
      setAnalytics(res.data);
    } catch { setError('Failed to load analytics.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await analyticsApi.exportCSRReport();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `csr-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Failed to export PDF.'); }
    finally { setExporting(false); }
  };

  const chartData = analytics ? METRICS.map(m => ({ name: m.label, value: (analytics as Record<string, number>)[m.key], fill: m.color })) : [];

  const inputStyle: React.CSSProperties = { padding: '8px 12px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.text, fontSize: '13px', outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <NavBar />
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: colors.text }}>CSR Analytics</h1>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>Track your social and environmental impact</p>
          </div>
          <button onClick={handleExportPDF} disabled={exporting || !analytics}
            style={{ padding: '10px 20px', background: exporting ? colors.border : colors.success, color: '#fff', border: 'none', borderRadius: radius.md, fontWeight: 600, fontSize: '13px', cursor: (exporting || !analytics) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {exporting ? '⏳ Exporting…' : '⬇ Export PDF'}
          </button>
        </div>

        {/* Date filter */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: colors.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: colors.textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={() => fetchAnalytics(from, to)}
            style={{ padding: '8px 18px', background: colors.primary, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Apply
          </button>
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); fetchAnalytics(); }}
              style={{ padding: '8px 14px', background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: '13px', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>

        {error && <div style={{ background: colors.dangerLight, border: `1px solid ${colors.danger}`, borderRadius: radius.md, padding: '12px 16px', color: colors.danger, marginBottom: '20px' }}>✕ {error}</div>}

        {/* Metric Cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '20px', animation: 'pulse 1.5s infinite' }}>
                <div style={{ height: '12px', background: colors.border, borderRadius: '4px', width: '50%', marginBottom: '12px' }} />
                <div style={{ height: '28px', background: colors.border, borderRadius: '4px', width: '70%' }} />
              </div>
            ))}
          </div>
        ) : analytics && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {METRICS.map(m => (
                <div key={m.key} className="fade-in"
                  style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: m.color }} />
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{m.icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: m.color, lineHeight: 1 }}>
                    {(analytics as Record<string, number>)[m.key].toLocaleString()}
                    {m.unit && <span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '4px', color: colors.textMuted }}>{m.unit}</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '6px', fontWeight: 500 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.textMuted, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact Summary</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: colors.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.text, fontSize: '13px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
