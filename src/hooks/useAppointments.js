import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to fetch and manage appointments data
 * @returns {Object} Appointments data and management functions
 */
export function useAppointments() {
  const { session, status } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({
    total: 0,
    local_count: 0,
    calcom_count: 0
  });

  /**
   * Fetch appointments based on filters
   * @param {Object} filters - Query filters (dateFrom, dateTo, status, type, etc.)
   */
  const fetchAppointments = useCallback(async (filters = {}) => {
    if (status !== 'authenticated' || !session?.access_token) {
      console.log('fetchAppointments: Not authenticated, skipping fetch');
      setAppointments([]);
      setMeta({ total: 0, local_count: 0, calcom_count: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.contact_id) queryParams.append('contact_id', filters.contact_id);
      if (filters.property_id) queryParams.append('property_id', filters.property_id);
      if (typeof filters.include_calcom === 'boolean') {
        queryParams.append('include_calcom', filters.include_calcom.toString());
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-appointments?${queryParams.toString()}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data) {
        throw new Error('No data received from appointments function');
      }

      setAppointments(data.appointments || []);
      setMeta(data.meta || {
        total: 0,
        local_count: 0,
        calcom_count: 0
      });

    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.message);
      setAppointments([]);
      setMeta({
        total: 0,
        local_count: 0,
        calcom_count: 0
      });
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, status]);

  return {
    appointments,
    loading,
    error,
    meta,
    fetchAppointments
  };
}