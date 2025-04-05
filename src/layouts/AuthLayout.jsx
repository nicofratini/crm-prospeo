import React from 'react';
import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg p-4">
      <div className="w-full max-w-md">
        {/* Logo or Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Prospeo</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Real Estate CRM</p>
        </div>

        {/* Auth Form Container */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;