import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to fetch and manage contacts data
 * @returns {Object} Contacts data and management functions
 */
export function useContacts() {
  const { session, status } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 0,
    sort: 'created_at',
    order: 'desc'
  });

  /**
   * Fetch contacts based on filters
   * @param {Object} filters - Query filters and pagination
   */
  const fetchContacts = useCallback(async (filters = {}) => {
    if (status !== 'authenticated' || !session?.access_token) {
      console.log('fetchContacts: Not authenticated, skipping fetch');
      setContacts([]);
      setMeta(prev => ({ ...prev, totalItems: 0, totalPages: 0 }));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-contacts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(filters)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setContacts(data.data || []);
      setMeta(data.meta || {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 0,
        sort: 'created_at',
        order: 'desc'
      });

    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err.message);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, status]);

  return {
    contacts,
    loading,
    error,
    meta,
    fetchContacts
  };
}