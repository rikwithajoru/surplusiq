import React, { useEffect, useRef, useState } from 'react';
import { notificationApi } from '../api/client';
import { colors, radius, shadow } from '../styles/theme';

interface Notification { _id: string; message: string; read: boolean; }

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await notificationApi.getNotifications();
      setNotifications((res.data as Notification[]).filter(n => !n.read));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleMarkRead(id: string) {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Notifications"
        style={{ position: 'relative', background: open ? colors.primaryLight : 'transparent', border: `1px solid ${open ? colors.primary : colors.border}`, borderRadius: radius.md, padding: '7px 10px', cursor: 'pointer', fontSize: '18px', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}>
        🔔
        {notifications.length > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: colors.danger, color: '#fff', borderRadius: '50%', fontSize: '10px', fontWeight: 700, minWidth: '18px', height: '18px', lineHeight: '18px', textAlign: 'center', padding: '0 3px' }}>
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadow.lg, minWidth: '300px', maxWidth: '360px', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '13px', color: colors.text }}>Notifications</span>
            {notifications.length > 0 && (
              <span style={{ fontSize: '11px', color: colors.textMuted }}>{notifications.length} unread</span>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
              All caught up!
            </div>
          ) : (
            <ul style={{ listStyle: 'none', maxHeight: '320px', overflowY: 'auto' }}>
              {notifications.map(n => (
                <li key={n._id} onClick={() => handleMarkRead(n._id)}
                  style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', fontSize: '13px', color: colors.text, display: 'flex', gap: '10px', alignItems: 'flex-start', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ marginTop: '2px', flexShrink: 0 }}>🔔</span>
                  <div>
                    <div>{n.message}</div>
                    <div style={{ fontSize: '11px', color: colors.textDim, marginTop: '3px' }}>Click to mark as read</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
