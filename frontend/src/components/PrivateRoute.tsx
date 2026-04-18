import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_DASHBOARDS: Record<string, string> = {
  restaurant: '/restaurant',
  ngo: '/ngo',
  admin: '/admin',
};

interface PrivateRouteProps {
  allowedRole: string;
  children: React.ReactNode;
}

export default function PrivateRoute({ allowedRole, children }: PrivateRouteProps) {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== allowedRole) {
    const permitted = user?.role ? ROLE_DASHBOARDS[user.role] : '/login';
    return <Navigate to={permitted ?? '/login'} replace />;
  }

  return <>{children}</>;
}
