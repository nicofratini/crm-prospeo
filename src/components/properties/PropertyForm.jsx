import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

// Form validation schema matching Edge Function requirements
const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().optional().nullable(),
  property_type: z.enum(['Maison', 'Appartement'], {
    required_error: "Property type is required"
  }),
  status: z.enum(['active', 'inactive', 'sold']).default('active'),
  price: z.string()
    .transform((val) => (val ? parseFloat(val) : null))
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
  
  // Additional fields
  city: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  area_sqm: z.string()
    .transform((val) => (val ? parseFloat(val) : null))
    .optional()
    .nullable(),
  num_rooms: z.string()
    .transform((val) => (val ? parseInt(val, 10) : null))
    .optional()
    .nullable(),
  num_bedrooms: z.string()
    .transform((val) => (val ? parseInt(val, 10) : null))
    .optional()
    .nullable(),
  num_bathrooms: z.string()
    .transform((val) => (val ? parseInt(val, 10) : null))
    .optional()
    .nullable(),
  main_image_url: z.string().url().optional().nullable(),
  virtual_tour_url: z.string().url().optional().nullable()
});

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

export function PropertyForm({ initialData, mode = 'create', propertyId }) {
  const navigate = useNavigate();
  const isEditMode = mode === 'edit';

  // Transform initial data for form fields
  const defaultValues = isEditMode ? {
    ...initialData,
    price: initialData.price?.toString() || '',
    area_sqm: initialData.area_sqm?.toString() || '',
    num_rooms: initialData.num_rooms?.toString() || '',
    num_bedrooms: initialData.num_bedrooms?.toString() || '',
    num_bathrooms: initialData.num_bathrooms?.toString() || '',
  } : {
    status: 'active',
    property_type: 'Maison',
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(propertySchema),
    defaultValues
  });

  const onSubmit = async (data) => {
    try {
      const url = isEditMode
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-property/${propertyId}`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-property`;

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} property`);
      }

      toast.success(`Property ${isEditMode ? 'updated' : 'created'} successfully`);
      if (!isEditMode) reset();
      navigate('/properties');

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} property:`, error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} property`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isEditMode ? 'Edit Property' : 'Add New Property'}
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Property Name *" error={errors.name?.message}>
              <input
                type="text"
                {...register('name')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Property Type *" error={errors.property_type?.message}>
              <select
                {...register('property_type')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="Maison">House</option>
                <option value="Appartement">Apartment</option>
              </select>
            </FormField>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Address" error={errors.address?.message}>
              <input
                type="text"
                {...register('address')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="City" error={errors.city?.message}>
              <input
                type="text"
                {...register('city')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="Price" error={errors.price?.message}>
              <input
                type="number"
                step="0.01"
                {...register('price')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Area (m²)" error={errors.area_sqm?.message}>
              <input
                type="number"
                {...register('area_sqm')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Status" error={errors.status?.message}>
              <select
                {...register('status')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="sold">Sold</option>
              </select>
            </FormField>
          </div>

          {/* Rooms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="Total Rooms" error={errors.num_rooms?.message}>
              <input
                type="number"
                {...register('num_rooms')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Bedrooms" error={errors.num_bedrooms?.message}>
              <input
                type="number"
                {...register('num_bedrooms')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Bathrooms" error={errors.num_bathrooms?.message}>
              <input
                type="number"
                {...register('num_bathrooms')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>
          </div>

          {/* Media */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Main Image URL" error={errors.main_image_url?.message}>
              <input
                type="url"
                {...register('main_image_url')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>

            <FormField label="Virtual Tour URL" error={errors.virtual_tour_url?.message}>
              <input
                type="url"
                {...register('virtual_tour_url')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </FormField>
          </div>

          {/* Description */}
          <FormField label="Description" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </FormField>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/properties')}
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
                : (isEditMode ? 'Save Changes' : 'Create Property')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}