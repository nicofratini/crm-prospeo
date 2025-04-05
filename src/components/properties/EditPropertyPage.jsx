import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PropertyForm } from './PropertyForm';
import toast from 'react-hot-toast';

export function EditPropertyPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperty = async () => {
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
          throw new Error(data.error || 'Failed to fetch property');
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
      fetchProperty();
    }
  }, [propertyId]);

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
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
            Edit Property
          </h1>
        </div>
        
        <div className="p-4">
          <PropertyForm 
            initialData={property} 
            mode="edit"
            propertyId={propertyId}
          />
        </div>
      </div>
    </main>
  );
}