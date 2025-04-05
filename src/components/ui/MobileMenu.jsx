import React from 'react';
import { Dialog } from '@headlessui/react';
import clsx from 'clsx';

export function MobileMenu({ isOpen, onClose, currentPage, onNavigate }) {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: HomeIcon },
    { id: 'contacts', label: 'Contacts', icon: UsersIcon },
    { id: 'properties', label: 'Propriétés', icon: BuildingIcon },
    { id: 'appointments', label: 'Rendez-vous', icon: CalendarIcon },
    { id: 'call-history', label: 'Historique Appels', icon: PhoneIcon },
    { id: 'ai-agent', label: 'Agent IA', icon: BotIcon },
    { id: 'settings', label: 'Paramètres', icon: GearIcon },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50 lg:hidden"
    >
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40" aria-hidden="true" />
      
      <div className="fixed inset-y-0 left-0 w-full max-w-xs">
        <Dialog.Panel className="h-full bg-white dark:bg-dark-card shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xl font-bold text-primary">Prospeo</span>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="p-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={clsx(
                  'flex w-full items-center gap-3 px-3 py-2 rounded-xl mb-1 transition-colors',
                  currentPage === item.id
                    ? 'bg-primary bg-opacity-15 text-primary dark:bg-opacity-20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
                )}
              >
                <item.icon />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

// Icons (same as Sidebar.jsx)
function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M224,115.55V208a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V168a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v40a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V115.55a16,16,0,0,1,5.17-11.78l80-75.48.11-.11a16,16,0,0,1,21.53,0,1.14,1.14,0,0,0,.11.11l80,75.48A16,16,0,0,1,224,115.55Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M208,72H180V64a12,12,0,0,0-12-12H88A12,12,0,0,0,76,64v8H48A20,20,0,0,0,28,92V192a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V92A20,20,0,0,0,208,72ZM92,68h72v4H92ZM44,192V92a4,4,0,0,1,4-4H76v12a12,12,0,0,0,12,12h80a12,12,0,0,0,12-12V88h28a4,4,0,0,1,4,4V192a4,4,0,0,1-4,4H48A4,4,0,0,1,44,192Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM48,48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48ZM208,208H48V96H208V208Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0A40.21,40.21,0,0,1,176,208Z" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M168,128a8,8,0,1,1-8-8A8,8,0,0,1,168,128ZM96,120a8,8,0,1,0,8,8A8,8,0,0,0,96,120Zm128,8c0,39.7-35.89,72-80,72s-80-32.3-80-72c0-26.26,15.93-49.48,40-62.59V56a24,24,0,0,1,24-24h32a24,24,0,0,1,24,24v9.41C208.07,78.52,224,101.74,224,128ZM160,56a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8V74.25a115.46,115.46,0,0,1,32-4.25,115.46,115.46,0,0,1,32,4.25Zm48,72c0-30.88-30.06-56-64-56S80,97.12,80,128s30.06,56,64,56S208,158.88,208,128ZM72,96a8,8,0,0,0-8-8H48a8,8,0,0,0,0,16H64A8,8,0,0,0,72,96Zm144-8h-8a8,8,0,0,0,0,16h8a8,8,0,0,0,0-16ZM48,136H32a8,8,0,0,0,0,16H48a8,8,0,0,0,0-16Zm176,0H208a8,8,0,0,0,0,16h16a8,8,0,0,0,0-16Z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.49A107.71,107.71,0,0,0,73.89,34.49a8,8,0,0,0-3.94,6L67.31,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.93,107.21,107.21,0,0,0-10.88,26.25,8,8,0,0,0,1.48,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.49,107.71,107.71,0,0,0,26.25-10.87,8,8,0,0,0,3.94-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.93,107.21,107.21,0,0,0,10.88-26.25,8,8,0,0,0-1.48-7.06ZM128,168A40,40,0,1,1,168,128,40,40,0,0,1,128,168Z" />
    </svg>
  );
}