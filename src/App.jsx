import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
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
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [subPage, setSubPage] = useState(null);
  const [entityId, setEntityId] = useState(null);

  const handleMenuItemClick = (page, sub = null, id = null) => {
    setCurrentPage(page);
    setSubPage(sub);
    setEntityId(id);
    setIsSidebarOpen(false);
  };

  const renderPage = () => {
    // Handle Properties pages
    if (currentPage === 'properties') {
      if (subPage === 'add') {
        return <AddPropertyPage />;
      }
      if (subPage === 'view' && entityId) {
        return <PropertyDetailPage propertyId={entityId} />;
      }
      if (subPage === 'edit' && entityId) {
        return <EditPropertyPage propertyId={entityId} />;
      }
      return <PropertiesPage 
        onAddProperty={() => handleMenuItemClick('properties', 'add')}
        onViewProperty={(id) => handleMenuItemClick('properties', 'view', id)}
        onEditProperty={(id) => handleMenuItemClick('properties', 'edit', id)}
      />;
    }

    // Handle Contacts pages
    if (currentPage === 'contacts') {
      if (subPage === 'view' && entityId) {
        return <ContactDetailPage contactId={entityId} />;
      }
      if (subPage === 'edit' && entityId) {
        return <EditContactPage contactId={entityId} />;
      }
      return <ContactsPage 
        onViewContact={(id) => handleMenuItemClick('contacts', 'view', id)}
        onEditContact={(id) => handleMenuItemClick('contacts', 'edit', id)}
      />;
    }

    // Other pages
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'call-history':
        return <CallHistoryPage />;
      case 'ai-agent':
        return <AiAgentPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg dark:text-gray-100 transition-colors duration-200">
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onNavigate={setCurrentPage}
        />
        <div className="max-w-[1440px] mx-auto">
          <div className="flex">
            <Sidebar 
              isOpen={isSidebarOpen} 
              onClose={() => setIsSidebarOpen(false)}
              currentPage={currentPage}
              onMenuItemClick={handleMenuItemClick}
            />
            {renderPage()}
          </div>
        </div>
        <MobileMenu 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
          currentPage={currentPage}
          onNavigate={handleMenuItemClick}
        />
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}