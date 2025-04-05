import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

// Form validation schema matching Edge Function requirements
const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string()
    .regex(/^\+?[0-9\s-()]{8,}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'client'])
    .default('new'),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  interested_property_id: z.string().uuid().optional().nullable(),
}).refine(
  data => data.email || data.phone,
  { message: "Either email or phone must be provided" }
);

const FormField = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    {children}
    {error && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    )}
  </div>
);

export function ContactForm({ initialData, mode = 'create', contactId }) {
  const navigate = useNavigate();
  const isEditMode = mode === 'edit';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: isEditMode ? initialData : {
      status: 'new',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      source: '',
      notes: '',
      company_name: '',
      job_title: '',
      interested_property_id: null
    }
  });

  const onSubmit = async (data) => {
    try {
      const url = isEditMode
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-contact/${contactId}`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-contact`;

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} contact`);
      }

      toast.success(`Contact ${isEditMode ? 'updated' : 'created'} successfully`);
      if (!isEditMode) reset();
      navigate('/contacts');

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} contact:`, error);
      toast.error(error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isEditMode ? 'Edit Contact' : 'Add New Contact'}
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="First Name *" error={errors.first_name?.message}>
              <input
                type="text"
                {...register('first_name')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Last Name *" error={errors.last_name?.message}>
              <input
                type="text"
                {...register('last_name')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Email" error={errors.email?.message}>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Phone" error={errors.phone?.message}>
              <input
                type="tel"
                {...register('phone')}
                placeholder="+1234567890"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Company Name" error={errors.company_name?.message}>
              <input
                type="text"
                {...register('company_name')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Job Title" error={errors.job_title?.message}>
              <input
                type="text"
                {...register('job_title')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Status" error={errors.status?.message}>
              <select
                {...register('status')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
                <option value="client">Client</option>
              </select>
            </FormField>

            <FormField label="Source" error={errors.source?.message}>
              <input
                type="text"
                {...register('source')}
                placeholder="e.g., Website, Referral"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>
          </div>

          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </FormField>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/contacts')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? (isEditMode ? 'Saving...' : 'Creating...') 
                : (isEditMode ? 'Save Changes' : 'Create Contact')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}