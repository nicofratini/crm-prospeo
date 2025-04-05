import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg dark:text-gray-100 transition-colors duration-200">
      <Header 
        onMenuClick={() => setIsSidebarOpen(true)} 
        onNavigate={(page) => navigate(`/${page}`)}
      />
      <div className="max-w-[1440px] mx-auto">
        <div className="flex">
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            onMenuItemClick={(page) => {
              navigate(`/${page}`);
              setIsSidebarOpen(false);
            }}
          />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/:contactId" element={<ContactDetailPage />} />
            <Route path="/contacts/edit/:contactId" element={<EditContactPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:propertyId" element={<PropertyDetailPage />} />
            <Route path="/properties/add" element={<AddPropertyPage />} />
            <Route path="/properties/edit/:propertyId" element={<EditPropertyPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/call-history" element={<CallHistoryPage />} />
            <Route path="/ai-agent" element={<AiAgentPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
      <MobileMenu 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={(page) => {
          navigate(`/${page}`);
          setIsSidebarOpen(false);
        }}
      />
      <Toaster position="top-right" />
    </div>
  );
}