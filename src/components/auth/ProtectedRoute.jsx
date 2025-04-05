import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Log current route and auth state
  console.log(`[ProtectedRoute] Checking route: ${location.pathname}. State:`, { 
    loading, 
    user: !!user 
  });

  // Show loading indicator while checking auth status
  if (loading) {
    console.log('[ProtectedRoute] Auth loading, rendering Loader...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to login...');
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If authenticated and not loading, render child routes
  console.log('[ProtectedRoute] Auth OK, rendering children/outlet.');
  return <Outlet />;
}

export default ProtectedRoute;