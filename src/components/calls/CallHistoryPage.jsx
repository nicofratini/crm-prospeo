import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';

export function CallHistoryPage() {
  return (
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-[1440px] mx-auto animate-fade-in">
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
            Historique des Appels
          </h1>
        </div>
        
        <div className="p-4">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Appels Récents
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 dark:text-gray-400">
                Contenu à venir...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}