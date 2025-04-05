import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAppointments } from '../../hooks/useAppointments';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';

const AppointmentsList = ({ appointments, onEdit, onDelete, cancellingId }) => (
  <div className="space-y-4">
    {appointments.map((appointment) => (
      <div
        key={appointment.id}
        className="p-4 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {appointment.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(appointment.start_time), 'MMM d, yyyy HH:mm')} - 
              {format(new Date(appointment.end_time), 'HH:mm')}
            </p>
            {appointment.contact && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Contact: {appointment.contact.first_name} {appointment.contact.last_name}
              </p>
            )}
            {appointment.property && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Property: {appointment.property.name}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            appointment.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
            appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {appointment.status}
          </span>
        </div>
        {appointment.description && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {appointment.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onEdit(appointment)}
            className="text-sm text-primary hover:text-primary-light"
            disabled={cancellingId === appointment.id}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(appointment)}
            disabled={cancellingId === appointment.id}
            className={`text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ${
              cancellingId === appointment.id ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {cancellingId === appointment.id ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      </div>
    ))}
  </div>
);

export function AppointmentsPage() {
  const { appointments, loading, error, meta, fetchAppointments } = useAppointments();
  const [filters, setFilters] = useState({
    dateFrom: startOfDay(new Date()).toISOString(),
    dateTo: endOfDay(addDays(new Date(), 7)).toISOString(),
    status: undefined,
    type: undefined,
    include_calcom: true
  });
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchAppointments(filters);
  }, [filters, fetchAppointments]);

  const handleEdit = (appointment) => {
    // TODO: Implement edit functionality
    console.log('Edit appointment:', appointment);
  };

  const handleDelete = async (appointment) => {
    // Don't allow cancelling already cancelled appointments
    if (appointment.status === 'cancelled') {
      toast.error('This appointment is already cancelled');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setCancellingId(appointment.id);

    try {
      // If it's a Cal.com booking, use their API endpoint
      const endpoint = appointment.calcom_booking_id
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-calcom-booking/${appointment.calcom_booking_id}`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-appointment/${appointment.id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel appointment');
      }

      toast.success('Appointment cancelled successfully');
      fetchAppointments(filters); // Refresh the list

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error(error.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
            Rendez-vous
          </h1>
          <Button onClick={() => console.log('Add appointment')}>
            Nouveau RDV
          </Button>
        </div>

        <div className="p-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="date"
                    value={filters.dateFrom.split('T')[0]}
                    onChange={(e) => setFilters({
                      ...filters,
                      dateFrom: startOfDay(new Date(e.target.value)).toISOString()
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="date"
                    value={filters.dateTo.split('T')[0]}
                    onChange={(e) => setFilters({
                      ...filters,
                      dateTo: endOfDay(new Date(e.target.value)).toISOString()
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Tous les statuts</option>
                  <option value="scheduled">Planifié</option>
                  <option value="confirmed">Confirmé</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                  <option value="rescheduled">Reporté</option>
                </select>

                <select
                  value={filters.type || ''}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Tous les types</option>
                  <option value="visit">Visite</option>
                  <option value="call">Appel</option>
                  <option value="signing">Signature</option>
                  <option value="valuation">Estimation</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Chargement des rendez-vous...
                </div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">
                  {error}
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Aucun rendez-vous trouvé
                </div>
              ) : (
                <>
                  <AppointmentsList
                    appointments={appointments}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    cancellingId={cancellingId}
                  />
                  {meta.calcom_count > 0 && (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      Inclut {meta.calcom_count} rendez-vous de Cal.com
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}