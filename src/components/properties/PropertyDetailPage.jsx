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

export function PropertyDetailPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-property-details/${propertyId}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          }
        );

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch property details');
        }

        setProperty(data.property);
        setError(null);

      } catch (err) {
        console.error('Error fetching property:', err);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

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
      navigate('/properties');

    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-[1440px] mx-auto animate-fade-in p-4">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">Loading property details...</p>
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
              onClick={() => navigate('/properties')}
              className="text-primary hover:text-primary-light"
            >
              Return to Properties
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
            Property Details
          </h1>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate(`/properties/edit/${propertyId}`)}
            >
              Edit Property
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Property'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
          {/* Main Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Property Information</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem 
                  label="Name" 
                  value={property.name}
                />
                <DetailItem 
                  label="Type" 
                  value={property.property_type}
                />
                <DetailItem 
                  label="Status" 
                  value={
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      property.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      property.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {property.status}
                    </span>
                  }
                />
                <DetailItem 
                  label="Price" 
                  value={property.price ? `$${property.price.toLocaleString()}` : '-'}
                />
                <DetailItem 
                  label="Area" 
                  value={property.area_sqm ? `${property.area_sqm} m²` : '-'}
                />
                <DetailItem 
                  label="Created" 
                  value={format(new Date(property.created_at), 'MMM d, yyyy')}
                />
              </div>

              {/* Location */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem 
                    label="Address" 
                    value={property.address || '-'}
                  />
                  <DetailItem 
                    label="City" 
                    value={property.city || '-'}
                  />
                  <DetailItem 
                    label="Postal Code" 
                    value={property.postal_code || '-'}
                  />
                </div>
              </div>

              {/* Rooms */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Rooms</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DetailItem 
                    label="Total Rooms" 
                    value={property.num_rooms || '-'}
                  />
                  <DetailItem 
                    label="Bedrooms" 
                    value={property.num_bedrooms || '-'}
                  />
                  <DetailItem 
                    label="Bathrooms" 
                    value={property.num_bathrooms || '-'}
                  />
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                    {property.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Media</h2>
            </CardHeader>
            <CardContent>
              {property.main_image_url ? (
                <div className="space-y-4">
                  <img
                    src={property.main_image_url}
                    alt={property.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {property.virtual_tour_url && (
                    <a
                      href={property.virtual_tour_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
                    >
                      View Virtual Tour
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No media available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}