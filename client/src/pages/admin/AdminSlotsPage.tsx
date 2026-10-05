import { PageHeader } from '../../components/ui/MobilityUI';
import React from 'react';

export const AdminSlotsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader eyebrow="Space inventory" title="Parking slots" description="A central place for your platform parking inventory." />
      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-600">
        System-wide slot mapping and inventory status.
      </div>
    </div>
  );
};
