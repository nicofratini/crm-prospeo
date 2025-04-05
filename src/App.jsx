import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/ui/Header';
import Sidebar from './components/Sidebar';
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
import { MobileMenu } from './components/ui/MobileMenu';
import AdminLayout from './layouts/AdminLayout';
import UsersPage from './pages/admin/UsersPage';
import AiAgentsAdminPage from './pages/admin/AiAgentsAdminPage';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleMenuItemClick = (itemId) => {
    navigate(`/${itemId}`);
    setIsSidebarOpen(false);
  };

  const MainAppLayout = () => (
    <>
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="max-w-[1440px] mx-auto">
        <div className="flex">
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            onMenuItemClick={handleMenuItemClick}
            currentPage={window.location.pathname.split('/')[1] || 'dashboard'}
          />
          <div className="flex-1">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="contacts" element={<ContactsPage />} />
              {/* Fix order of routes to prevent conflicts */}
              <Route path="contacts/edit/:contactId" element={<EditContactPage />} />
              <Route path="contacts/:contactId" element={<ContactDetailPage />} />
              <Route path="properties" element={<PropertiesPage />} />
              <Route path="properties/add" element={<AddPropertyPage />} />
              <Route path="properties/edit/:propertyId" element={<EditPropertyPage />} />
              <Route path="properties/:propertyId" element={<PropertyDetailPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="call-history" element={<CallHistoryPage />} />
              <Route path="ai-agent" element={<AiAgentPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </div>
      </div>
      <MobileMenu 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg dark:text-gray-100 transition-colors duration-200">
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="users" element={<UsersPage />} />
          <Route path="ai-agents" element={<AiAgentsAdminPage />} />
          <Route index element={<Navigate to="users" replace />} />
        </Route>

        {/* Main App Routes */}
        <Route path="/*" element={<MainAppLayout />} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}