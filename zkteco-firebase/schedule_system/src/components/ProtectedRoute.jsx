import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 * Optional allowedRoles prop restricts access by role.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userProfile, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If role restrictions exist, enforce them
  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
