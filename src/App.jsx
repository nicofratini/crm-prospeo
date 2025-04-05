import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import DefaultLayout from './layouts/DefaultLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Admin Pages
import UsersPage from './pages/admin/UsersPage';
import AiAgentsAdminPage from './pages/admin/AiAgentsAdminPage';

// Main App Pages
import Dashboard from './components/Dashboard';
import { ContactsPage } from './components/contacts/ContactsPage';
import { ContactDetailPage } from './components/contacts/ContactDetailPage';
import { EditContactPage } from './components/contacts/EditContactPage';
import { PropertiesPage } from './components/properties/PropertiesPage';
import { PropertyDetailPage } from './components/properties/PropertyDetailPage';
import { AddPropertyPage } from './components/properties/AddPropertyPage';
import { EditPropertyPage } from './components/properties/EditPropertyPage';
import { AppointmentsPage } from './components/appointments/AppointmentsPage';
import { CallHistoryPage } from './components/calls/CallHistoryPage';
import { AiAgentPage } from './components/ai/AiAgentPage';
import { SettingsPage } from './components/settings/SettingsPage';

export default function App() {
  return (
    <>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route index element={<Navigate to="login" replace />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Admin Routes - Protected by AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<UsersPage />} />
            <Route path="ai-agents" element={<AiAgentsAdminPage />} />
            {/* Redirect /admin to /admin/users by default */}
            <Route index element={<Navigate to="users" replace />} />
          </Route>

          {/* Main App Routes */}
          <Route path="/" element={<DefaultLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="contacts/:contactId" element={<ContactDetailPage />} />
            <Route path="contacts/edit/:contactId" element={<EditContactPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="properties/:propertyId" element={<PropertyDetailPage />} />
            <Route path="properties/add" element={<AddPropertyPage />} />
            <Route path="properties/edit/:propertyId" element={<EditPropertyPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="call-history" element={<CallHistoryPage />} />
            <Route path="ai-agent" element={<AiAgentPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <Toaster position="top-right" />
    </>
  );
}