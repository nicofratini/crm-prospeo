import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const DetailItem = ({ label, value }) => (
  <div className="space-y-1">
    <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
  </div>
);

const CallHistoryItem = ({ call }) => (
  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-dark-hover">
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {format(new Date(call.call_timestamp), 'MMM d, yyyy HH:mm')}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Duration: {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
      </p>
    </div>
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      call.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
      call.status === 'missed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }`}>
      {call.status}
    </span>
  </div>
);

export function ContactDetailPage() {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchContactDetails = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-contact-details/${contactId}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          }
        );

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch contact details');
        }

        setContact(data.contact);
        setRecentCalls(data.recentCalls || []);
        setError(null);

      } catch (err) {
        console.error('Error fetching contact:', err);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (contactId) {
      fetchContactDetails();
    }
  }, [contactId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);

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
      navigate('/contacts');

    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-[1440px] mx-auto animate-fade-in p-4">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">Loading contact details...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-[1440px] mx-auto animate-fade-in p-4">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-red-500 dark:text-red-400">{error}</p>
            <button
              onClick={() => navigate('/contacts')}
              className="text-primary hover:text-primary-light"
            >
              Return to Contacts
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
            Contact Details
          </h1>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate(`/contacts/edit/${contactId}`)}
            >
              Edit Contact
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Contact'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
          {/* Main Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem 
                  label="Full Name" 
                  value={`${contact.first_name} ${contact.last_name}`}
                />
                <DetailItem 
                  label="Email" 
                  value={contact.email || '-'}
                />
                <DetailItem 
                  label="Phone" 
                  value={contact.phone || '-'}
                />
                <DetailItem 
                  label="Status" 
                  value={
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      contact.status === 'new' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      contact.status === 'contacted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      contact.status === 'qualified' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      contact.status === 'unqualified' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {contact.status}
                    </span>
                  }
                />
                <DetailItem 
                  label="Company" 
                  value={contact.company_name || '-'}
                />
                <DetailItem 
                  label="Job Title" 
                  value={contact.job_title || '-'}
                />
                <DetailItem 
                  label="Source" 
                  value={contact.source || '-'}
                />
                <DetailItem 
                  label="Created" 
                  value={format(new Date(contact.created_at), 'MMM d, yyyy')}
                />
              </div>

              {contact.notes && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                    {contact.notes}
                  </p>
                </div>
              )}

              {contact.interested_property && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Interested Property
                  </h3>
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-dark-hover">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {contact.interested_property.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {contact.interested_property.property_type} • 
                      ${contact.interested_property.price?.toLocaleString() || 'Price not set'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Calls</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCalls.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No calls recorded yet
                  </p>
                ) : (
                  recentCalls.map((call) => (
                    <CallHistoryItem key={call.id} call={call} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}