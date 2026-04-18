export const colors = {
  bg: '#0f1117',
  surface: '#1a1d27',
  surfaceHover: '#22263a',
  border: '#2a2d3e',
  borderLight: '#353849',
  primary: '#6366f1',
  primaryHover: '#4f52d9',
  primaryLight: 'rgba(99,102,241,0.15)',
  success: '#22c55e',
  successLight: 'rgba(34,197,94,0.15)',
  warning: '#f59e0b',
  warningLight: 'rgba(245,158,11,0.15)',
  danger: '#ef4444',
  dangerLight: 'rgba(239,68,68,0.15)',
  info: '#3b82f6',
  infoLight: 'rgba(59,130,246,0.15)',  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
};

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
};

export const shadow = {
  sm: '0 1px 3px rgba(0,0,0,0.4)',
  md: '0 4px 12px rgba(0,0,0,0.5)',
  lg: '0 8px 24px rgba(0,0,0,0.6)',
  glow: '0 0 20px rgba(99,102,241,0.3)',
};

export const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#0f1117',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  color: colors.text,
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

export const btn = {
  primary: {
    padding: '10px 24px',
    background: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: radius.md,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.1s',
  } as React.CSSProperties,
  ghost: {
    padding: '10px 24px',
    background: 'transparent',
    color: colors.textMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: '14px',
    cursor: 'pointer',
  } as React.CSSProperties,
  danger: {
    padding: '10px 24px',
    background: colors.danger,
    color: '#fff',
    border: 'none',
    borderRadius: radius.md,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
};

import React from 'react';
