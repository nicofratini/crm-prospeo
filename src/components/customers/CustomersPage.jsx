import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useContacts } from '../../hooks/useContacts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ContactsTable = ({ contacts, onView, onEdit, onDelete, deletingId }) => (
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
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => onView(contact.id)}
                  className="text-primary hover:text-primary-light text-sm font-medium"
                >
                  View
                </button>
                <button 
                  onClick={() => onEdit(contact.id)}
                  className="text-primary hover:text-primary-light text-sm font-medium"
                >
                  Edit
                </button>
                <button 
                  onClick={() => onDelete(contact.id)}
                  disabled={deletingId === contact.id}
                  className={`text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium ${
                    deletingId === contact.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {deletingId === contact.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export function CustomersPage({ onViewContact, onEditContact }) {
  const { contacts, loading, error, meta, fetchContacts } = useContacts();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    sort: 'created_at',
    order: 'desc'
  });

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      return;
    }

    setDeletingId(contactId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-contact/${contactId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete contact');
      }

      toast.success('Contact deleted successfully');
      fetchContacts(filters); // Refresh the list

    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">Contacts</h1>
          <Button onClick={() => setIsAddModalOpen(true)}>Add Contact</Button>
        </div>

        <div className="p-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
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
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="created_at">Sort by Date</option>
                  <option value="first_name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
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
                <ContactsTable 
                  contacts={contacts}
                  onView={onViewContact}
                  onEdit={onEditContact}
                  onDelete={handleDeleteContact}
                  deletingId={deletingId}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}