import React from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { colors, radius } from '../styles/theme';

const ROLE_ICONS: Record<string, string> = { restaurant: '🍽', ngo: '🤝', admin: '⚙️' };
const ROLE_LABELS: Record<string, string> = { restaurant: 'Restaurant', ngo: 'NGO', admin: 'Admin' };

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: '60px',
      background: 'rgba(26,29,39,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${colors.border}`,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>🌱</span>
        <span style={{ fontWeight: 700, fontSize: '16px', color: colors.text }}>SurplusIQ</span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <NotificationBell />

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{user.orgName}</div>
              <div style={{ fontSize: '11px', color: colors.textMuted }}>
                {ROLE_ICONS[user.role]} {ROLE_LABELS[user.role]}
              </div>
            </div>
            <button onClick={logout}
              style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.textMuted, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = colors.danger; (e.target as HTMLButtonElement).style.color = colors.danger; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = colors.border; (e.target as HTMLButtonElement).style.color = colors.textMuted; }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
