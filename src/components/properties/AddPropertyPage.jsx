import React from 'react';
import { PropertyForm } from './PropertyForm';

export function AddPropertyPage() {
  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
            Add New Property
          </h1>
        </div>
        
        <div className="p-4">
          <PropertyForm />
        </div>
      </div>
    </main>
  );
}