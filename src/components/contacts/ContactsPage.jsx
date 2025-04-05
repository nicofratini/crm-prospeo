import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useContacts } from '../../hooks/useContacts';
import { ContactForm } from './ContactForm';

const ContactsTable = ({ contacts, onViewDetails }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[800px]">
      <thead>
        <tr className="border-b border-gray-100 dark:border-gray-800">
          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Contact</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Company</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Property Interest</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((contact) => (
          <tr 
            key={contact.id}
            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
          >
            <td className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {(contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{contact.email}</p>
                </div>
              </div>
            </td>
            <td className="py-3 px-4">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                contact.status === 'new' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                contact.status === 'contacted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                contact.status === 'qualified' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                contact.status === 'unqualified' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {contact.status}
              </span>
            </td>
            <td className="py-3 px-4">
              <p className="text-sm text-gray-900 dark:text-white">{contact.company_name || '-'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{contact.job_title || ''}</p>
            </td>
            <td className="py-3 px-4">
              {contact.interested_property ? (
                <p className="text-sm text-gray-900 dark:text-white">{contact.interested_property.name}</p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">-</p>
              )}
            </td>
            <td className="py-3 px-4 text-right">
              <button 
                onClick={() => onViewDetails(contact)}
                className="text-primary hover:text-primary-light text-sm font-medium"
              >
                View Details
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ContactFilters = ({ filters, onChange }) => (
  <div className="flex flex-wrap items-center gap-4">
    <div className="flex-1 min-w-[200px]">
      <input
        type="text"
        placeholder="Search contacts..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
    
    <select
      value={filters.status || ''}
      onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
    >
      <option value="">All Status</option>
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="qualified">Qualified</option>
      <option value="unqualified">Unqualified</option>
      <option value="client">Client</option>
    </select>
    
    <select
      value={filters.sort}
      onChange={(e) => onChange({ ...filters, sort: e.target.value })}
      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
    >
      <option value="created_at">Sort by Date</option>
      <option value="first_name">Sort by Name</option>
      <option value="email">Sort by Email</option>
      <option value="status">Sort by Status</option>
    </select>
  </div>
);

const Pagination = ({ meta, onPageChange }) => {
  const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1);
  
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {((meta.currentPage - 1) * meta.itemsPerPage) + 1} to {Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems)} of {meta.totalItems} contacts
      </p>
      <div className="flex items-center gap-2">
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              page === meta.currentPage
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-hover'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
};

export function ContactsPage() {
  const { contacts, loading, error, meta, fetchContacts } = useContacts();
  const [showContactForm, setShowContactForm] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    sort: 'created_at',
    order: 'desc'
  });

  useEffect(() => {
    fetchContacts(filters);
  }, [filters, fetchContacts]);

  const handleViewDetails = (contact) => {
    // TODO: Implement contact details view
    console.log('View contact details:', contact);
  };

  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">Contacts</h1>
          <Button onClick={() => setShowContactForm(true)}>Add Contact</Button>
        </div>

        <div className="p-4">
          <Card>
            <CardHeader>
              <ContactFilters 
                filters={filters} 
                onChange={setFilters}
              />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Loading contacts...
                </div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">
                  {error}
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No contacts found
                </div>
              ) : (
                <>
                  <ContactsTable 
                    contacts={contacts}
                    onViewDetails={handleViewDetails}
                  />
                  <Pagination 
                    meta={meta}
                    onPageChange={(page) => setFilters(f => ({ ...f, page }))}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showContactForm && (
        <ContactForm onClose={() => {
          setShowContactForm(false);
          fetchContacts(filters);
        }} />
      )}
    </main>
  );
}