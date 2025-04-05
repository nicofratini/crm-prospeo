import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';

function Appointment({ text, checked = false }) {
  return (
    <label className="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover px-3 -mx-3 rounded-lg transition-colors duration-200 cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={checked}
        className="checkbox-custom"
      />
      <p className="text-gray-700 dark:text-gray-200 text-sm">{text}</p>
    </label>
  );
}

export function AppointmentList() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-gray-900 dark:text-white text-lg font-semibold">Rendez-vous</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Appointment text="Visite appartement Rue Victor Hugo" checked={true} />
          <Appointment text="Appel client pour estimation" />
          <Appointment text="Signature compromis Villa Montpellier" />
        </div>
      </CardContent>
    </Card>
  );
}