import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading indicator while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated, preserving the attempted URL
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Render child routes if authenticated
  return <Outlet />;
}

export default ProtectedRoute;