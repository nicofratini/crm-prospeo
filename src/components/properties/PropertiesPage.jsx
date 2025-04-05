import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useProperties } from '../../hooks/useProperties';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const PropertiesTable = ({ properties, onViewDetails, onEdit, onDelete, deletingId }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[800px]">
      <thead>
        <tr className="border-b border-gray-100 dark:border-gray-800">
          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Property</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Price</th>
          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
        </tr>
      </thead>
      <tbody>
        {properties.map((property) => (
          <tr 
            key={property.id}
            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
          >
            <td className="py-3 px-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{property.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{property.address}</p>
              </div>
            </td>
            <td className="py-3 px-4">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                {property.property_type}
              </span>
            </td>
            <td className="py-3 px-4">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                property.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                property.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {property.status}
              </span>
            </td>
            <td className="py-3 px-4 text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                ${property.price?.toLocaleString() ?? '-'}
              </p>
            </td>
            <td className="py-3 px-4 text-right">
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => onEdit(property.id)}
                  className="text-primary hover:text-primary-light text-sm font-medium"
                >
                  Edit
                </button>
                <button 
                  onClick={() => onDelete(property.id)}
                  disabled={deletingId === property.id}
                  className={`text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium ${
                    deletingId === property.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {deletingId === property.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PropertyFilters = ({ filters, onChange }) => (
  <div className="flex flex-wrap items-center gap-4">
    <div className="flex-1 min-w-[200px]">
      <input
        type="text"
        placeholder="Search properties..."
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
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="sold">Sold</option>
    </select>
    
    <select
      value={filters.property_type || ''}
      onChange={(e) => onChange({ ...filters, property_type: e.target.value || undefined })}
      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
    >
      <option value="">All Types</option>
      <option value="Maison">House</option>
      <option value="Appartement">Apartment</option>
    </select>
    
    <select
      value={filters.sort}
      onChange={(e) => onChange({ ...filters, sort: e.target.value })}
      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-hover text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
    >
      <option value="created_at">Sort by Date</option>
      <option value="name">Sort by Name</option>
      <option value="price">Sort by Price</option>
      <option value="status">Sort by Status</option>
    </select>
  </div>
);

const Pagination = ({ meta, onPageChange }) => {
  const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1);
  
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {((meta.currentPage - 1) * meta.itemsPerPage) + 1} to {Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems)} of {meta.totalItems} properties
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

export function PropertiesPage({ onAddProperty, onEditProperty }) {
  const { properties, loading, error, meta, fetchProperties } = useProperties();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    sort: 'created_at',
    order: 'desc'
  });
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    setDeletingId(propertyId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-property/${propertyId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete property');
      }

      toast.success('Property deleted successfully');
      fetchProperties(filters); // Refresh the list

    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">Properties</h1>
          <Button onClick={onAddProperty}>Add Property</Button>
        </div>

        <div className="p-4">
          <Card>
            <CardHeader>
              <PropertyFilters 
                filters={filters} 
                onChange={setFilters}
              />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Loading properties...
                </div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">
                  {error}
                </div>
              ) : properties.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No properties found
                </div>
              ) : (
                <>
                  <PropertiesTable 
                    properties={properties}
                    onEdit={onEditProperty}
                    onDelete={handleDeleteProperty}
                    deletingId={deletingId}
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
    </main>
  );
}